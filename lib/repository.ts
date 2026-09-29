import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { atlasPack, demoItems, demoSettings, demoSpaces } from './seed.ts';
import {
  DEFAULT_PERMISSIONS,
  ITEM_TYPES,
  type ActivityEntry,
  type AppSettings,
  type ContextPack,
  type ExportBundle,
  type PersonalItem,
  type Relation,
  type Space,
  type UndoRecord,
  type WorkspaceSnapshot,
} from './context-types.ts';
import { itemIsInPack } from './permissions.ts';
import { rankItems, type SearchFilters } from './search.ts';

export const CHANGE_EVENT = 'compass:change';
// Keep the original IndexedDB name so existing same-origin workspaces survive the product rename.
const DATABASE_NAME = 'contextdock-v1';
const IMPORT_LIMIT = 20 * 1024 * 1024;
const urlSchema = z
  .string()
  .url()
  .max(2048)
  .refine(
    (value) => ['https:', 'http:'].includes(new URL(value).protocol),
    'Only HTTP(S) URLs are allowed',
  );
const short = z.string().trim().min(1).max(160);
const body = z.string().max(20_000);
const tags = z.array(z.string().trim().min(1).max(40)).max(20);

export const itemInputSchema = z
  .object({
    type: z.enum(ITEM_TYPES),
    spaceId: z.string().min(1).max(120),
    title: short,
    body,
    tags,
    dueDate: z.string().max(40).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    url: urlSchema.optional(),
    language: z.string().max(60).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'bookmark' && !value.url)
      context.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'Bookmarks require an HTTP(S) URL',
      });
  });

export const itemPatchSchema = z
  .object({
    spaceId: z.string().min(1).max(120).optional(),
    title: short.optional(),
    body: body.optional(),
    tags: tags.optional(),
    dueDate: z.string().max(40).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
    url: urlSchema.nullable().optional(),
    language: z.string().max(60).nullable().optional(),
    completed: z.boolean().optional(),
  })
  .strict();

const spaceSchema = z
  .object({
    id: z.string(),
    name: short,
    description: z.string().max(500),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
const persistedItemSchema = itemInputSchema.safeExtend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.string().max(240),
  createdBy: z.enum(['human', 'agent', 'demo']),
  metadata: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});
const packSchema = z
  .object({
    id: z.string(),
    name: short,
    description: z.string().max(1000),
    spaceIds: z.array(z.string()).max(100),
    itemIds: z.array(z.string()).max(500),
    allowedTypes: z.array(z.enum(ITEM_TYPES)).min(1).max(4),
    createdAt: z.string(),
    updatedAt: z.string(),
    active: z.boolean(),
  })
  .strict();
const relationSchema = z
  .object({
    id: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    relation: z.enum([
      'related',
      'supports',
      'blocks',
      'references',
      'follow_up',
    ]),
    createdAt: z.string(),
    createdBy: z.enum(['human', 'agent', 'demo']),
  })
  .strict();
const settingsSchema = z
  .object({
    id: z.literal('settings'),
    initialized: z.boolean(),
    activeSpaceId: z.string().optional(),
    activePackId: z.string().optional(),
    permissions: z
      .object({
        webmcpEnabled: z.boolean(),
        readEnabled: z.boolean(),
        writeEnabled: z.boolean(),
        allowedTypes: z
          .object({
            note: z.boolean(),
            task: z.boolean(),
            bookmark: z.boolean(),
            snippet: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export const importBundleSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string(),
    spaces: z.array(spaceSchema).max(200),
    items: z.array(persistedItemSchema).max(5000),
    packs: z.array(packSchema).max(200),
    relations: z.array(relationSchema).max(5000),
    settings: settingsSchema,
  })
  .strict();

class CompassDatabase extends Dexie {
  spaces!: EntityTable<Space, 'id'>;
  items!: EntityTable<PersonalItem, 'id'>;
  packs!: EntityTable<ContextPack, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  activity!: EntityTable<ActivityEntry, 'id'>;
  relations!: EntityTable<Relation, 'id'>;
  undo!: EntityTable<UndoRecord, 'id'>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      spaces: 'id, name, updatedAt',
      items: 'id, spaceId, type, updatedAt, completed, *tags',
      packs: 'id, active, updatedAt',
      settings: 'id',
      activity: 'id, timestamp, actor, status, itemId',
      relations: 'id, sourceId, targetId',
      undo: 'id, activityId, consumed',
    });
  }
}

export const db = new CompassDatabase();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const iso = () => new Date().toISOString();
export const notifyChange = () => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export async function getSnapshot(): Promise<WorkspaceSnapshot> {
  return db.transaction('r', db.tables, async () => {
    const [settings, spaces, items, packs, activity, relations] =
      await Promise.all([
        db.settings.get('settings'),
        db.spaces.toArray(),
        db.items.toArray(),
        db.packs.toArray(),
        db.activity.orderBy('timestamp').reverse().limit(100).toArray(),
        db.relations.toArray(),
      ]);
    return { settings, spaces, items, packs, activity, relations };
  });
}

async function replaceWithDemoWorkspace(onlyIfMissing = false) {
  await db.transaction(
    'rw',
    [
      db.spaces,
      db.items,
      db.packs,
      db.settings,
      db.activity,
      db.relations,
      db.undo,
    ],
    async () => {
      if (onlyIfMissing && (await db.settings.get('settings'))) return;
      await Promise.all([
        db.spaces.clear(),
        db.items.clear(),
        db.packs.clear(),
        db.activity.clear(),
        db.relations.clear(),
        db.undo.clear(),
      ]);
      await db.spaces.bulkPut(demoSpaces);
      await db.items.bulkPut(demoItems);
      await db.packs.put(atlasPack);
      await db.settings.put(structuredClone(demoSettings));
      await db.activity.put({
        id: uid('activity'),
        timestamp: iso(),
        actor: 'demo',
        tool: 'demo_workspace',
        operation: 'loaded',
        result: 'Loaded fictional Project Atlas workspace',
        status: 'success',
      });
    },
  );
}

export async function loadDemoWorkspace() {
  await replaceWithDemoWorkspace();
  notifyChange();
}

export async function getOrInitializeDemoSnapshot(): Promise<WorkspaceSnapshot> {
  const current = await getSnapshot();
  if (current.settings) return current;

  await replaceWithDemoWorkspace(true);
  return getSnapshot();
}

export async function startEmptyWorkspace() {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.settings.put({
      id: 'settings',
      initialized: true,
      permissions: {
        ...structuredClone(DEFAULT_PERMISSIONS),
        webmcpEnabled: false,
      },
    });
  });
  notifyChange();
}

export async function clearAllLocalData() {
  await startEmptyWorkspace();
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'id'>>) {
  return db.transaction('rw', db.tables, async () => {
    const current = (await db.settings.get('settings')) ?? {
      id: 'settings' as const,
      initialized: true,
      permissions: structuredClone(DEFAULT_PERMISSIONS),
    };
    await db.settings.put({
      ...current,
      ...patch,
      permissions: patch.permissions ?? current.permissions,
    });
    notifyChange();
  });
}

export async function createSpace(name: string, description = '') {
  const parsed = short.parse(name);
  const timestamp = iso();
  const space: Space = {
    id: uid('space'),
    name: parsed,
    description: description.slice(0, 500),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.spaces.put(space);
  await updateSettings({ activeSpaceId: space.id });
  return space;
}

export async function renameSpace(id: string, name: string) {
  return db.transaction('rw', db.tables, async () => {
    const space = await db.spaces.get(id);
    if (!space) throw new Error('Space not found');
    await db.spaces.put({
      ...space,
      name: short.parse(name),
      updatedAt: iso(),
    });
    notifyChange();
  });
}

export async function createPack(
  input: Pick<
    ContextPack,
    'name' | 'description' | 'spaceIds' | 'itemIds' | 'allowedTypes'
  >,
  activate = false,
  actor: 'human' | 'agent' = 'human',
) {
  return db.transaction('rw', db.tables, async () => {
    const parsed = packSchema
      .omit({ id: true, createdAt: true, updatedAt: true, active: true })
      .parse(input);
    const timestamp = iso();
    if (
      (await db.spaces.bulkGet(parsed.spaceIds)).some((space) => !space) ||
      (await db.items.bulkGet(parsed.itemIds)).some((item) => !item)
    )
      throw new Error('Pack references missing content');
    const pack: ContextPack = {
      id: uid('pack'),
      ...parsed,
      createdAt: timestamp,
      updatedAt: timestamp,
      active: activate,
    };
    await db.transaction(
      'rw',
      db.packs,
      db.settings,
      db.activity,
      db.undo,
      async () => {
        if (activate) {
          await db.packs.toCollection().modify({ active: false });
          const settings = await db.settings.get('settings');
          if (settings)
            await db.settings.put({ ...settings, activePackId: pack.id });
        }
        await db.packs.put(pack);
        await recordWrite(
          'pack',
          {
            actor,
            tool:
              actor === 'agent' ? 'create_context_pack' : 'human_create_pack',
            operation: 'created pack',
            result: `Created Context Pack “${pack.name}”`,
            status: 'success',
          },
          { packId: pack.id, afterPack: pack },
        );
      },
    );
    notifyChange();
    return pack;
  });
}

export async function activatePack(id: string) {
  return db.transaction('rw', db.tables, async () => {
    const pack = await db.packs.get(id);
    if (!pack) throw new Error('Context Pack not found');
    await db.transaction(
      'rw',
      db.packs,
      db.settings,
      db.activity,
      db.undo,
      async () => {
        await db.packs.toCollection().modify({ active: false });
        await db.packs.update(id, { active: true, updatedAt: iso() });
        const settings = await db.settings.get('settings');
        if (settings) await db.settings.put({ ...settings, activePackId: id });
      },
    );
    notifyChange();
  });
}

async function recordWrite(
  kind: UndoRecord['kind'],
  activityBase: Omit<ActivityEntry, 'id' | 'timestamp' | 'undoId'>,
  data: Pick<
    UndoRecord,
    'itemId' | 'relationId' | 'before' | 'after' | 'packId' | 'afterPack'
  >,
) {
  const activityId = uid('activity');
  const undoId = uid('undo');
  await db.activity.put({
    id: activityId,
    timestamp: iso(),
    ...activityBase,
    undoId,
  });
  await db.undo.put({
    id: undoId,
    activityId,
    kind,
    ...data,
    consumed: false,
    createdAt: iso(),
  });
}

export async function createItem(
  input: unknown,
  actor: 'human' | 'agent' = 'human',
  tool = 'human_create_item',
) {
  return db.transaction('rw', db.tables, async () => {
    const parsed = itemInputSchema.parse(input);
    if (!(await db.spaces.get(parsed.spaceId)))
      throw new Error('Space not found');
    const timestamp = iso();
    const item: PersonalItem = {
      id: uid('item'),
      ...parsed,
      createdAt: timestamp,
      updatedAt: timestamp,
      source: actor === 'agent' ? 'WebMCP' : 'Compass UI',
      createdBy: actor,
    };
    await db.transaction('rw', db.items, db.activity, db.undo, async () => {
      await db.items.put(item);
      await recordWrite(
        'create',
        {
          actor,
          tool,
          operation: 'created item',
          itemId: item.id,
          itemTitle: item.title,
          result: `Created ${item.type} “${item.title}”`,
          status: 'success',
        },
        { itemId: item.id, after: item },
      );
    });
    notifyChange();
    return item;
  });
}

export async function updateItem(
  id: string,
  rawPatch: unknown,
  actor: 'human' | 'agent' = 'human',
  tool = 'human_update_item',
  expected?: PersonalItem,
) {
  return db.transaction('rw', db.tables, async () => {
    const before = await db.items.get(id);
    if (!before) throw new Error('Item not found');
    if (expected && !sameRecord(before, expected))
      throw new Error(
        'Item changed while you were editing. Close and reopen it before saving.',
      );
    const patch = itemPatchSchema.parse(rawPatch);
    if (patch.spaceId && !(await db.spaces.get(patch.spaceId)))
      throw new Error('Space not found');
    const cleaned = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );
    const item = persistedItemSchema.parse({
      ...before,
      ...cleaned,
      updatedAt: iso(),
    }) as PersonalItem;
    await db.transaction('rw', db.items, db.activity, db.undo, async () => {
      await db.items.put(item);
      await recordWrite(
        'update',
        {
          actor,
          tool,
          operation: 'updated item',
          itemId: id,
          itemTitle: item.title,
          result: `Updated ${item.type} “${item.title}”`,
          status: 'success',
        },
        { itemId: id, before, after: item },
      );
    });
    notifyChange();
    return item;
  });
}

export async function completeTask(
  id: string,
  completed: boolean,
  actor: 'human' | 'agent' = 'human',
  tool = 'human_complete_task',
) {
  return db.transaction('rw', db.tables, async () => {
    const before = await db.items.get(id);
    if (!before) throw new Error('Item not found');
    if (before.type !== 'task') throw new Error('Only tasks can be completed');
    const item = { ...before, completed, updatedAt: iso() };
    await db.transaction('rw', db.items, db.activity, db.undo, async () => {
      await db.items.put(item);
      await recordWrite(
        'complete',
        {
          actor,
          tool,
          operation: completed ? 'completed task' : 'reopened task',
          itemId: id,
          itemTitle: item.title,
          result: `${completed ? 'Completed' : 'Reopened'} “${item.title}”`,
          status: 'success',
        },
        { itemId: id, before, after: item },
      );
    });
    notifyChange();
    return item;
  });
}

export async function linkItems(
  sourceId: string,
  targetId: string,
  relation: Relation['relation'],
  actor: 'human' | 'agent' = 'human',
  tool = 'human_link_items',
) {
  return db.transaction('rw', db.tables, async () => {
    if (sourceId === targetId) throw new Error('Choose two different items');
    const [source, target] = await Promise.all([
      db.items.get(sourceId),
      db.items.get(targetId),
    ]);
    if (!source || !target) throw new Error('Item not found');
    relationSchema.shape.relation.parse(relation);
    if (
      (await db.relations.toArray()).some(
        (entry) =>
          entry.sourceId === sourceId &&
          entry.targetId === targetId &&
          entry.relation === relation,
      )
    )
      throw new Error('These items already have this relation');
    const record: Relation = {
      id: uid('relation'),
      sourceId,
      targetId,
      relation,
      createdAt: iso(),
      createdBy: actor,
    };
    await db.transaction('rw', db.relations, db.activity, db.undo, async () => {
      await db.relations.put(record);
      await recordWrite(
        'link',
        {
          actor,
          tool,
          operation: 'linked items',
          itemId: source.id,
          itemTitle: source.title,
          result: `Linked “${source.title}” ${relation} “${target.title}”`,
          status: 'success',
        },
        { relationId: record.id },
      );
    });
    notifyChange();
    return record;
  });
}

const sameRecord = (a: unknown, b: unknown): boolean => {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, v]) => [key, canonical(v)]),
          )
        : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
};

export async function undoActivity(activityId: string) {
  await db.transaction('rw', db.tables, async () => {
    const activity = await db.activity.get(activityId);
    const undo = await db.undo.where('activityId').equals(activityId).first();
    if (!activity || !undo || undo.consumed)
      throw new Error('This action can no longer be undone');
    if (undo.itemId) {
      if (!undo.after)
        throw new Error(
          'This older action has no safe undo snapshot. Edit the item manually.',
        );
      if (!sameRecord(await db.items.get(undo.itemId), undo.after))
        throw new Error(
          'Item changed after this action. Undo newer changes first, or edit it manually.',
        );
    }
    if (undo.kind === 'create' && undo.itemId) {
      const linked = (await db.relations.toArray()).some(
        (r) => r.sourceId === undo.itemId || r.targetId === undo.itemId,
      );
      const included = (await db.packs.toArray()).some((p) =>
        p.itemIds.includes(undo.itemId!),
      );
      if (linked || included)
        throw new Error(
          'Item is referenced by a relation or Context Pack. Undo that action first.',
        );
      await db.items.delete(undo.itemId);
    }
    if ((undo.kind === 'update' || undo.kind === 'complete') && undo.before)
      await db.items.put(undo.before);
    if (undo.kind === 'link' && undo.relationId) {
      if (!(await db.relations.get(undo.relationId)))
        throw new Error('Relation no longer exists');
      await db.relations.delete(undo.relationId);
    }
    if (undo.kind === 'pack' && undo.packId) {
      const pack = await db.packs.get(undo.packId);
      if (!pack || pack.active || !sameRecord(pack, undo.afterPack))
        throw new Error(
          'Pack has been activated or changed. It cannot be undone.',
        );
      await db.packs.delete(undo.packId);
    }
    await db.undo.update(undo.id, { consumed: true });
    await db.activity.update(activityId, {
      status: 'undone',
      result: `${activity.result} — undone by human`,
    });
    await db.activity.put({
      id: uid('activity'),
      timestamp: iso(),
      actor: 'human',
      tool: 'undo',
      operation: 'undid action',
      itemId: activity.itemId,
      itemTitle: activity.itemTitle,
      result: `Undid: ${activity.result}`,
      status: 'success',
    });
  });
  notifyChange();
}

export async function getActiveScope() {
  const settings = await db.settings.get('settings');
  const pack = settings?.activePackId
    ? await db.packs.get(settings.activePackId)
    : undefined;
  return { settings, pack };
}

export async function getPermittedItems(
  pack: ContextPack,
  settings: AppSettings,
) {
  const items = await db.items.toArray();
  return items.filter(
    (item) =>
      itemIsInPack(item, pack) && settings.permissions.allowedTypes[item.type],
  );
}

export async function searchPermitted(
  pack: ContextPack,
  settings: AppSettings,
  filters: SearchFilters,
) {
  const [items, spaces] = await Promise.all([
    getPermittedItems(pack, settings),
    db.spaces.toArray(),
  ]);
  return rankItems(items, spaces, filters);
}

export async function logDenied(
  tool: string,
  result: string,
  itemTitle?: string,
) {
  await db.activity.put({
    id: uid('activity'),
    timestamp: iso(),
    actor: 'agent',
    tool,
    operation: 'permission check',
    itemTitle,
    result,
    status: 'denied',
  });
  notifyChange();
}

export async function exportWorkspace(): Promise<ExportBundle> {
  const snapshot = await getSnapshot();
  if (!snapshot.settings) throw new Error('Workspace is not initialized');
  const bundle: ExportBundle = {
    version: 1,
    exportedAt: iso(),
    spaces: snapshot.spaces,
    items: snapshot.items,
    packs: snapshot.packs,
    relations: snapshot.relations,
    settings: snapshot.settings,
  };
  if (
    new TextEncoder().encode(JSON.stringify(bundle, null, 2)).byteLength >
    IMPORT_LIMIT
  )
    throw new Error('Workspace exceeds the 20 MB portable backup limit.');
  return bundle;
}

export async function importWorkspace(text: string) {
  if (new TextEncoder().encode(text).byteLength > IMPORT_LIMIT)
    throw new Error('IMPORT_INVALID: Import exceeds the 20 MB limit');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('IMPORT_INVALID: File is not valid JSON');
  }
  const parsed = importBundleSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      `IMPORT_INVALID: ${parsed.error.issues[0]?.message ?? 'Invalid workspace shape'}`,
    );
  const bundle = parsed.data as ExportBundle;
  for (const records of [
    bundle.spaces,
    bundle.items,
    bundle.packs,
    bundle.relations,
  ]) {
    if (
      records.some((record) => !record.id.trim()) ||
      new Set(records.map((r) => r.id)).size !== records.length
    )
      throw new Error('IMPORT_INVALID: Empty or duplicate record IDs');
  }
  const spaces = new Set(bundle.spaces.map((r) => r.id));
  const items = new Set(bundle.items.map((r) => r.id));
  const packs = new Set(bundle.packs.map((r) => r.id));
  if (
    bundle.items.some((r) => !spaces.has(r.spaceId)) ||
    bundle.packs.some(
      (p) =>
        p.spaceIds.some((id) => !spaces.has(id)) ||
        p.itemIds.some((id) => !items.has(id)),
    ) ||
    bundle.relations.some(
      (r) =>
        !items.has(r.sourceId) ||
        !items.has(r.targetId) ||
        r.sourceId === r.targetId,
    ) ||
    (bundle.settings.activeSpaceId &&
      !spaces.has(bundle.settings.activeSpaceId)) ||
    (bundle.settings.activePackId && !packs.has(bundle.settings.activePackId))
  )
    throw new Error(
      'IMPORT_INVALID: Workspace references missing or invalid content',
    );
  if (
    bundle.packs.some(
      (p) => p.active !== (p.id === bundle.settings.activePackId),
    )
  )
    throw new Error('IMPORT_INVALID: Active pack settings disagree');
  bundle.settings.initialized = true;
  bundle.settings.permissions.webmcpEnabled = false;

  await db.transaction(
    'rw',
    [
      db.spaces,
      db.items,
      db.packs,
      db.settings,
      db.activity,
      db.relations,
      db.undo,
    ],
    async () => {
      await Promise.all([
        db.spaces.clear(),
        db.items.clear(),
        db.packs.clear(),
        db.activity.clear(),
        db.relations.clear(),
        db.undo.clear(),
      ]);
      await db.spaces.bulkPut(bundle.spaces);
      await db.items.bulkPut(bundle.items);
      await db.packs.bulkPut(bundle.packs);
      await db.relations.bulkPut(bundle.relations);
      await db.settings.put(bundle.settings);
      await db.activity.put({
        id: uid('activity'),
        timestamp: iso(),
        actor: 'human',
        tool: 'import_json',
        operation: 'imported workspace',
        result: `Imported ${bundle.items.length} items`,
        status: 'success',
      });
    },
  );
  notifyChange();
}
