import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { atlasPack, demoItems, demoSettings, demoSpaces } from './seed.ts';
import { DEFAULT_PERMISSIONS, ITEM_TYPES, type ActivityEntry, type AppSettings, type ContextPack, type ExportBundle, type PersonalItem, type Relation, type Space, type UndoRecord, type WorkspaceSnapshot } from './context-types.ts';
import { itemIsInPack } from './permissions.ts';
import { rankItems, type SearchFilters } from './search.ts';

export const CHANGE_EVENT = 'compass:change';
// Keep the original IndexedDB name so existing same-origin workspaces survive the product rename.
const DATABASE_NAME = 'contextdock-v1';
const IMPORT_LIMIT = 2 * 1024 * 1024;
const urlSchema = z.string().url().max(2048).refine((value) => ['https:', 'http:'].includes(new URL(value).protocol), 'Only HTTP(S) URLs are allowed');
const short = z.string().trim().min(1).max(160);
const body = z.string().max(20_000);
const tags = z.array(z.string().trim().min(1).max(40)).max(20);

export const itemInputSchema = z.object({
  type: z.enum(ITEM_TYPES), spaceId: z.string().min(1).max(120), title: short, body,
  tags, dueDate: z.string().max(40).optional(), priority: z.enum(['low', 'medium', 'high']).optional(),
  url: urlSchema.optional(), language: z.string().max(60).optional(), completed: z.boolean().optional(),
}).strict().superRefine((value, context) => {
  if (value.type === 'bookmark' && !value.url) context.addIssue({ code: 'custom', path: ['url'], message: 'Bookmarks require an HTTP(S) URL' });
});

export const itemPatchSchema = z.object({
  spaceId: z.string().min(1).max(120).optional(), title: short.optional(), body: body.optional(), tags: tags.optional(),
  dueDate: z.string().max(40).nullable().optional(), priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
  url: urlSchema.nullable().optional(), language: z.string().max(60).nullable().optional(), completed: z.boolean().optional(),
}).strict();

const spaceSchema = z.object({ id: z.string(), name: short, description: z.string().max(500), createdAt: z.string(), updatedAt: z.string() }).strict();
const persistedItemSchema = itemInputSchema.safeExtend({
  id: z.string(), createdAt: z.string(), updatedAt: z.string(), source: z.string().max(240), createdBy: z.enum(['human', 'agent', 'demo']), metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
const packSchema = z.object({
  id: z.string(), name: short, description: z.string().max(1000), spaceIds: z.array(z.string()).max(100), itemIds: z.array(z.string()).max(500),
  allowedTypes: z.array(z.enum(ITEM_TYPES)).max(4), createdAt: z.string(), updatedAt: z.string(), active: z.boolean(),
}).strict();
const relationSchema = z.object({ id: z.string(), sourceId: z.string(), targetId: z.string(), relation: z.enum(['related', 'supports', 'blocks', 'references', 'follow_up']), createdAt: z.string(), createdBy: z.enum(['human', 'agent', 'demo']) }).strict();
const settingsSchema = z.object({
  id: z.literal('settings'), initialized: z.boolean(), activeSpaceId: z.string().optional(), activePackId: z.string().optional(),
  permissions: z.object({ webmcpEnabled: z.boolean(), readEnabled: z.boolean(), writeEnabled: z.boolean(), allowedTypes: z.object({ note: z.boolean(), task: z.boolean(), bookmark: z.boolean(), snippet: z.boolean() }).strict() }).strict(),
}).strict();
export const importBundleSchema = z.object({ version: z.literal(1), exportedAt: z.string(), spaces: z.array(spaceSchema).max(200), items: z.array(persistedItemSchema).max(5000), packs: z.array(packSchema).max(200), relations: z.array(relationSchema).max(5000), settings: settingsSchema }).strict();

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
      spaces: 'id, name, updatedAt', items: 'id, spaceId, type, updatedAt, completed, *tags', packs: 'id, active, updatedAt',
      settings: 'id', activity: 'id, timestamp, actor, status, itemId', relations: 'id, sourceId, targetId', undo: 'id, activityId, consumed',
    });
  }
}

export const db = new CompassDatabase();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const iso = () => new Date().toISOString();
export const notifyChange = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export async function getSnapshot(): Promise<WorkspaceSnapshot> {
  const [settings, spaces, items, packs, activity, relations] = await Promise.all([
    db.settings.get('settings'), db.spaces.toArray(), db.items.toArray(), db.packs.toArray(), db.activity.orderBy('timestamp').reverse().limit(100).toArray(), db.relations.toArray(),
  ]);
  return { settings, spaces, items, packs, activity, relations };
}

export async function loadDemoWorkspace() {
  await db.transaction('rw', [db.spaces, db.items, db.packs, db.settings, db.activity, db.relations, db.undo], async () => {
    await Promise.all([db.spaces.clear(), db.items.clear(), db.packs.clear(), db.activity.clear(), db.relations.clear(), db.undo.clear()]);
    await db.spaces.bulkPut(demoSpaces); await db.items.bulkPut(demoItems); await db.packs.put(atlasPack); await db.settings.put(structuredClone(demoSettings));
    await db.activity.put({ id: uid('activity'), timestamp: iso(), actor: 'demo', tool: 'demo_workspace', operation: 'loaded', result: 'Loaded fictional Project Atlas workspace', status: 'success' });
  });
  notifyChange();
}

export async function startEmptyWorkspace() {
  await db.delete(); await db.open();
  await db.settings.put({ id: 'settings', initialized: true, permissions: structuredClone(DEFAULT_PERMISSIONS) });
  notifyChange();
}

export async function clearAllLocalData() {
  await db.delete(); await db.open(); notifyChange();
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'id'>>) {
  const current = (await db.settings.get('settings')) ?? { id: 'settings' as const, initialized: true, permissions: structuredClone(DEFAULT_PERMISSIONS) };
  await db.settings.put({ ...current, ...patch, permissions: patch.permissions ?? current.permissions }); notifyChange();
}

export async function createSpace(name: string, description = '') {
  const parsed = short.parse(name); const timestamp = iso();
  const space: Space = { id: uid('space'), name: parsed, description: description.slice(0, 500), createdAt: timestamp, updatedAt: timestamp };
  await db.spaces.put(space); await updateSettings({ activeSpaceId: space.id }); return space;
}

export async function renameSpace(id: string, name: string) {
  const space = await db.spaces.get(id); if (!space) throw new Error('Space not found');
  await db.spaces.put({ ...space, name: short.parse(name), updatedAt: iso() }); notifyChange();
}

export async function createPack(input: Pick<ContextPack, 'name' | 'description' | 'spaceIds' | 'itemIds' | 'allowedTypes'>, activate = false) {
  const parsed = packSchema.omit({ id: true, createdAt: true, updatedAt: true, active: true }).parse(input); const timestamp = iso();
  const pack: ContextPack = { id: uid('pack'), ...parsed, createdAt: timestamp, updatedAt: timestamp, active: activate };
  await db.transaction('rw', db.packs, db.settings, async () => {
    if (activate) { await db.packs.toCollection().modify({ active: false }); const settings = await db.settings.get('settings'); if (settings) await db.settings.put({ ...settings, activePackId: pack.id }); }
    await db.packs.put(pack);
  }); notifyChange(); return pack;
}

export async function activatePack(id: string) {
  const pack = await db.packs.get(id); if (!pack) throw new Error('Context Pack not found');
  await db.transaction('rw', db.packs, db.settings, async () => { await db.packs.toCollection().modify({ active: false }); await db.packs.update(id, { active: true, updatedAt: iso() }); const settings = await db.settings.get('settings'); if (settings) await db.settings.put({ ...settings, activePackId: id }); }); notifyChange();
}

async function recordWrite(kind: UndoRecord['kind'], activityBase: Omit<ActivityEntry, 'id' | 'timestamp' | 'undoId'>, data: Pick<UndoRecord, 'itemId' | 'relationId' | 'before'>) {
  const activityId = uid('activity'); const undoId = uid('undo');
  await db.activity.put({ id: activityId, timestamp: iso(), ...activityBase, undoId });
  await db.undo.put({ id: undoId, activityId, kind, ...data, consumed: false, createdAt: iso() });
}

export async function createItem(input: unknown, actor: 'human' | 'agent' = 'human', tool = 'human_create_item') {
  const parsed = itemInputSchema.parse(input); if (!(await db.spaces.get(parsed.spaceId))) throw new Error('Space not found');
  const timestamp = iso(); const item: PersonalItem = { id: uid('item'), ...parsed, createdAt: timestamp, updatedAt: timestamp, source: actor === 'agent' ? 'WebMCP' : 'Compass UI', createdBy: actor };
  await db.transaction('rw', db.items, db.activity, db.undo, async () => { await db.items.put(item); await recordWrite('create', { actor, tool, operation: 'created item', itemId: item.id, itemTitle: item.title, result: `Created ${item.type} “${item.title}”`, status: 'success' }, { itemId: item.id }); }); notifyChange(); return item;
}

export async function updateItem(id: string, rawPatch: unknown, actor: 'human' | 'agent' = 'human', tool = 'human_update_item') {
  const before = await db.items.get(id); if (!before) throw new Error('Item not found'); const patch = itemPatchSchema.parse(rawPatch);
  if (patch.spaceId && !(await db.spaces.get(patch.spaceId))) throw new Error('Space not found');
  const cleaned = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value === null ? undefined : value]));
  const item = { ...before, ...cleaned, updatedAt: iso() } as PersonalItem;
  await db.transaction('rw', db.items, db.activity, db.undo, async () => { await db.items.put(item); await recordWrite('update', { actor, tool, operation: 'updated item', itemId: id, itemTitle: item.title, result: `Updated ${item.type} “${item.title}”`, status: 'success' }, { itemId: id, before }); }); notifyChange(); return item;
}

export async function completeTask(id: string, completed: boolean, actor: 'human' | 'agent' = 'human', tool = 'human_complete_task') {
  const before = await db.items.get(id); if (!before) throw new Error('Item not found'); if (before.type !== 'task') throw new Error('Only tasks can be completed');
  const item = { ...before, completed, updatedAt: iso() };
  await db.transaction('rw', db.items, db.activity, db.undo, async () => { await db.items.put(item); await recordWrite('complete', { actor, tool, operation: completed ? 'completed task' : 'reopened task', itemId: id, itemTitle: item.title, result: `${completed ? 'Completed' : 'Reopened'} “${item.title}”`, status: 'success' }, { itemId: id, before }); }); notifyChange(); return item;
}

export async function linkItems(sourceId: string, targetId: string, relation: Relation['relation'], actor: 'human' | 'agent' = 'human', tool = 'human_link_items') {
  if (sourceId === targetId) throw new Error('Choose two different items'); const [source, target] = await Promise.all([db.items.get(sourceId), db.items.get(targetId)]); if (!source || !target) throw new Error('Item not found');
  const record: Relation = { id: uid('relation'), sourceId, targetId, relation, createdAt: iso(), createdBy: actor };
  await db.transaction('rw', db.relations, db.activity, db.undo, async () => { await db.relations.put(record); await recordWrite('link', { actor, tool, operation: 'linked items', itemId: source.id, itemTitle: source.title, result: `Linked “${source.title}” ${relation} “${target.title}”`, status: 'success' }, { relationId: record.id }); }); notifyChange(); return record;
}

export async function undoActivity(activityId: string) {
  const activity = await db.activity.get(activityId); const undo = await db.undo.where('activityId').equals(activityId).first();
  if (!activity || !undo || undo.consumed) throw new Error('This action can no longer be undone');
  await db.transaction('rw', db.items, db.relations, db.activity, db.undo, async () => {
    if (undo.kind === 'create' && undo.itemId) await db.items.delete(undo.itemId);
    if ((undo.kind === 'update' || undo.kind === 'complete') && undo.before) await db.items.put(undo.before);
    if (undo.kind === 'link' && undo.relationId) await db.relations.delete(undo.relationId);
    await db.undo.update(undo.id, { consumed: true }); await db.activity.update(activityId, { status: 'undone', result: `${activity.result} — undone by human` });
    await db.activity.put({ id: uid('activity'), timestamp: iso(), actor: 'human', tool: 'undo', operation: 'undid agent action', itemId: activity.itemId, itemTitle: activity.itemTitle, result: `Undid: ${activity.result}`, status: 'success' });
  }); notifyChange();
}

export async function getActiveScope() {
  const settings = await db.settings.get('settings'); const pack = settings?.activePackId ? await db.packs.get(settings.activePackId) : undefined; return { settings, pack };
}

export async function getPermittedItems(pack: ContextPack, settings: AppSettings) {
  const items = await db.items.toArray(); return items.filter((item) => itemIsInPack(item, pack) && settings.permissions.allowedTypes[item.type]);
}

export async function searchPermitted(pack: ContextPack, settings: AppSettings, filters: SearchFilters) {
  const [items, spaces] = await Promise.all([getPermittedItems(pack, settings), db.spaces.toArray()]); return rankItems(items, spaces, filters);
}

export async function logDenied(tool: string, result: string, itemTitle?: string) {
  await db.activity.put({ id: uid('activity'), timestamp: iso(), actor: 'agent', tool, operation: 'permission check', itemTitle, result, status: 'denied' }); notifyChange();
}

export async function exportWorkspace(): Promise<ExportBundle> {
  const snapshot = await getSnapshot(); if (!snapshot.settings) throw new Error('Workspace is not initialized');
  return { version: 1, exportedAt: iso(), spaces: snapshot.spaces, items: snapshot.items, packs: snapshot.packs, relations: snapshot.relations, settings: snapshot.settings };
}

export async function importWorkspace(text: string) {
  if (new TextEncoder().encode(text).byteLength > IMPORT_LIMIT) throw new Error('IMPORT_INVALID: Import exceeds the 2 MB limit');
  let raw: unknown; try { raw = JSON.parse(text); } catch { throw new Error('IMPORT_INVALID: File is not valid JSON'); }
  const parsed = importBundleSchema.safeParse(raw); if (!parsed.success) throw new Error(`IMPORT_INVALID: ${parsed.error.issues[0]?.message ?? 'Invalid workspace shape'}`);
  const bundle = parsed.data as ExportBundle;
  const ids = new Set(bundle.spaces.map((space) => space.id)); if (bundle.items.some((item) => !ids.has(item.spaceId))) throw new Error('IMPORT_INVALID: An item references a missing Space');
  await db.transaction('rw', [db.spaces, db.items, db.packs, db.settings, db.activity, db.relations, db.undo], async () => {
    await Promise.all([db.spaces.clear(), db.items.clear(), db.packs.clear(), db.activity.clear(), db.relations.clear(), db.undo.clear()]);
    await db.spaces.bulkPut(bundle.spaces); await db.items.bulkPut(bundle.items); await db.packs.bulkPut(bundle.packs); await db.relations.bulkPut(bundle.relations); await db.settings.put(bundle.settings);
    await db.activity.put({ id: uid('activity'), timestamp: iso(), actor: 'human', tool: 'import_json', operation: 'imported workspace', result: `Imported ${bundle.items.length} items`, status: 'success' });
  }); notifyChange();
}
