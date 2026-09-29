import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { atlasPack, demoItems, demoSettings } from '@/lib/seed';
import { assertAgentAccess, itemIsInPack } from '@/lib/permissions';
import { rankItems } from '@/lib/search';
import {
  clearAllLocalData,
  completeTask,
  db,
  getOrInitializeDemoSnapshot,
  getSnapshot,
  importWorkspace,
  itemInputSchema,
  loadDemoWorkspace,
  undoActivity,
  updateSettings,
  createItem,
  updateItem,
  createPack,
  linkItems,
  exportWorkspace,
  activatePack,
} from '@/lib/repository';
import { registerCompassTools, unregisterCompassTools } from '@/lib/webmcp';

beforeEach(async () => {
  unregisterCompassTools();
  db.close();
  await db.delete();
  await db.open();
  delete (globalThis as { document?: unknown }).document;
});

describe('permissions and Context Pack scope', () => {
  it('enforces read, write, and type gates inside trusted settings', () => {
    expect(assertAgentAccess(demoSettings, atlasPack, 'read')).toBeNull();
    expect(
      assertAgentAccess(
        {
          ...demoSettings,
          permissions: { ...demoSettings.permissions, writeEnabled: false },
        },
        atlasPack,
        'write',
      ),
    ).toBe('WRITE_PERMISSION_DENIED');
    expect(
      assertAgentAccess(
        {
          ...demoSettings,
          permissions: {
            ...demoSettings.permissions,
            allowedTypes: {
              ...demoSettings.permissions.allowedTypes,
              note: false,
            },
          },
        },
        atlasPack,
        'read',
        'note',
      ),
    ).toBe('TYPE_PERMISSION_DENIED');
  });

  it('does not include records outside an active Pack', () => {
    const item = { ...demoItems[0]!, spaceId: 'private-space' };
    expect(itemIsInPack(item, atlasPack)).toBe(false);
    expect(itemIsInPack(demoItems[0]!, atlasPack)).toBe(true);
  });
});

describe('deterministic search and validation', () => {
  it('ranks exact title ahead of body-only matches', () => {
    const ranked = rankItems(
      demoItems,
      [
        {
          id: 'space-atlas',
          name: 'Project Atlas',
          description: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      { query: 'Launch Readiness' },
    );
    expect(ranked[0]?.item.id).toBe('note-readiness');
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it('rejects unknown item fields and unsafe bookmark URLs', () => {
    expect(
      itemInputSchema.safeParse({
        type: 'note',
        spaceId: 'x',
        title: 'Hi',
        body: '',
        tags: [],
        injected: true,
      }).success,
    ).toBe(false);
    expect(
      itemInputSchema.safeParse({
        type: 'bookmark',
        spaceId: 'x',
        title: 'Bad',
        body: '',
        tags: [],
        url: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });

  it('rejects malformed imports without replacing current state', async () => {
    await loadDemoWorkspace();
    const before = (await getSnapshot()).items.length;
    await expect(
      importWorkspace('{"version":1,"__proto__":{"polluted":true}}'),
    ).rejects.toThrow('IMPORT_INVALID');
    expect((await getSnapshot()).items.length).toBe(before);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe('writes, task completion, and undo', () => {
  it('restores task state from undo history', async () => {
    await loadDemoWorkspace();
    const task = await completeTask('task-dns', true, 'agent', 'complete_task');
    expect(task.completed).toBe(true);
    const activity = (await getSnapshot()).activity.find(
      (entry) => entry.itemId === 'task-dns' && entry.actor === 'agent',
    );
    expect(activity?.undoId).toBeTruthy();
    await undoActivity(activity!.id);
    expect((await db.items.get('task-dns'))?.completed).toBe(false);
  });
});

describe('WebMCP registration lifecycle and integration', () => {
  it('initializes fictional demo context on a clean public origin', async () => {
    const snapshot = await getOrInitializeDemoSnapshot();
    expect(snapshot.settings).toMatchObject({
      initialized: true,
      activePackId: 'pack-atlas-launch',
    });
    expect(snapshot.items).toHaveLength(21);

    await clearAllLocalData();
    const empty = await getOrInitializeDemoSnapshot();
    expect(empty.settings?.initialized).toBe(true);
    expect(empty.items).toHaveLength(0);
  });

  it('waits briefly for a browser that injects Model Context after hydration', async () => {
    const registrations: string[] = [];
    const pending = registerCompassTools(demoSettings, {
      contextTimeoutMs: 100,
      pollIntervalMs: 10,
    });
    globalThis.setTimeout(() => {
      (globalThis as { document?: unknown }).document = {
        modelContext: {
          registerTool: (tool: { name: string }) =>
            registrations.push(tool.name),
        },
      };
    }, 15);
    const result = await pending;
    expect(result.supported).toBe(true);
    expect(result.registered).toContain('get_active_context');
    expect(registrations).toContain('create_personal_item');
  });

  it('aborts old registrations and changes exposed write tools', async () => {
    const registrations: Array<{
      tool: { name: string; execute: (args: unknown) => Promise<unknown> };
      signal?: AbortSignal;
    }> = [];
    (globalThis as { document?: unknown }).document = {
      modelContext: {
        registerTool: (
          tool: { name: string; execute: (args: unknown) => Promise<unknown> },
          options?: { signal?: AbortSignal },
        ) => {
          registrations.push({ tool, signal: options?.signal });
        },
      },
    };
    const first = await registerCompassTools(demoSettings);
    expect(first.registered).toContain('create_personal_item');
    const firstSignal = registrations[0]?.signal;
    const restricted = {
      ...demoSettings,
      permissions: { ...demoSettings.permissions, writeEnabled: false },
    };
    const second = await registerCompassTools(restricted);
    expect(firstSignal?.aborted).toBe(true);
    expect(second.registered).not.toContain('create_personal_item');
    expect(second.registered).toContain('search_personal_context');
  });

  it('searches, creates, audits, then denies after write is disabled', async () => {
    await loadDemoWorkspace();
    const tools = new Map<
      string,
      { execute: (args: unknown) => Promise<Record<string, unknown>> }
    >();
    (globalThis as { document?: unknown }).document = {
      modelContext: {
        registerTool: (tool: {
          name: string;
          execute: (args: unknown) => Promise<Record<string, unknown>>;
        }) => {
          tools.set(tool.name, tool);
        },
      },
    };
    await registerCompassTools(demoSettings);
    const search = await tools
      .get('search_personal_context')!
      .execute({ query: 'launch blockers', limit: 5 });
    expect(search.ok, JSON.stringify(search)).toBe(true);
    const before = (await getSnapshot()).items.length;
    const created = await tools
      .get('create_personal_item')!
      .execute({
        type: 'task',
        spaceId: 'space-atlas',
        title: 'Validate DNS propagation',
        body: 'Confirm global resolution before the launch window.',
        tags: ['dns', 'launch'],
        priority: 'high',
      });
    expect(created).toMatchObject({ ok: true });
    expect((await getSnapshot()).items.length).toBe(before + 1);
    expect(
      (await getSnapshot()).activity.some(
        (entry) =>
          entry.actor === 'agent' && entry.tool === 'create_personal_item',
      ),
    ).toBe(true);
    await updateSettings({
      permissions: { ...demoSettings.permissions, writeEnabled: false },
    });
    const denied = await tools
      .get('create_personal_item')!
      .execute({
        type: 'task',
        spaceId: 'space-atlas',
        title: 'Should not exist',
        body: '',
        tags: [],
      });
    expect(denied).toMatchObject({
      ok: false,
      code: 'WRITE_PERMISSION_DENIED',
    });
    expect((await getSnapshot()).items.length).toBe(before + 1);
  });
});

describe('data integrity regressions', () => {
  it('validates the complete bookmark after a patch and preserves content on failure', async () => {
    await loadDemoWorkspace();
    const item = await createItem({
      type: 'bookmark',
      spaceId: 'space-atlas',
      title: 'Docs',
      body: '',
      tags: [],
      url: 'https://example.com',
    });
    await expect(updateItem(item.id, { url: null })).rejects.toThrow(
      'Bookmarks require',
    );
    expect((await db.items.get(item.id))?.url).toBe('https://example.com');
  });
  it('clears optional fields and rejects a stale editor save', async () => {
    await loadDemoWorkspace();
    const original = await db.items.get('task-dns');
    const changed = await updateItem('task-dns', {
      priority: null,
      dueDate: null,
      title: 'New title',
    });
    expect(changed.priority).toBeUndefined();
    await expect(
      updateItem(
        'task-dns',
        { title: 'Stale title' },
        'human',
        'human_update_item',
        original,
      ),
    ).rejects.toThrow('while you were editing');
    expect((await db.items.get('task-dns'))?.title).toBe('New title');
  });
  it('refuses old undo over later human edits, then supports undo in reverse order', async () => {
    await loadDemoWorkspace();
    await updateItem('task-dns', { title: 'Agent edit' }, 'agent');
    const first = (await getSnapshot()).activity.find(
      (a) => a.actor === 'agent',
    )!;
    await updateItem('task-dns', { body: 'Human work' });
    const second = (await getSnapshot()).activity.find(
      (a) => a.actor === 'human',
    )!;
    await expect(undoActivity(first.id)).rejects.toThrow('changed after');
    expect((await db.items.get('task-dns'))?.body).toBe('Human work');
    await undoActivity(second.id);
    await undoActivity(first.id);
    expect((await db.items.get('task-dns'))?.title).not.toBe('Agent edit');
  });
  it('protects referenced items and can undo links and inactive agent Packs', async () => {
    await loadDemoWorkspace();
    const item = await createItem(
      {
        type: 'note',
        spaceId: 'space-atlas',
        title: 'New note',
        body: '',
        tags: [],
      },
      'agent',
    );
    const created = (await getSnapshot()).activity.find(
      (a) => a.itemId === item.id,
    )!;
    await linkItems(item.id, 'task-dns', 'supports', 'agent');
    const linked = (await getSnapshot()).activity.find(
      (a) => a.operation === 'linked items',
    )!;
    await expect(undoActivity(created.id)).rejects.toThrow('referenced');
    await undoActivity(linked.id);
    await createPack(
      {
        name: 'Review',
        description: '',
        spaceIds: [],
        itemIds: [item.id],
        allowedTypes: ['note'],
      },
      false,
      'agent',
    );
    const packed = (await getSnapshot()).activity.find(
      (a) => a.tool === 'create_context_pack',
    )!;
    await expect(undoActivity(created.id)).rejects.toThrow('referenced');
    await undoActivity(packed.id);
    await undoActivity(created.id);
    expect(await db.items.get(item.id)).toBeUndefined();
  });
  it('cannot undo a Pack that has been activated', async () => {
    await loadDemoWorkspace();
    const pack = await createPack(
      {
        name: 'Review',
        description: '',
        spaceIds: ['space-atlas'],
        itemIds: [],
        allowedTypes: ['note'],
      },
      false,
      'agent',
    );
    const activity = (await getSnapshot()).activity.find(
      (a) => a.tool === 'create_context_pack',
    )!;
    await activatePack(pack.id);
    await expect(undoActivity(activity.id)).rejects.toThrow('activated');
  });
  it('rejects duplicate relations without adding activity', async () => {
    await loadDemoWorkspace();
    await linkItems('note-readiness', 'task-dns', 'related');
    const before = await db.activity.count();
    await expect(
      linkItems('note-readiness', 'task-dns', 'related'),
    ).rejects.toThrow('already');
    expect(await db.activity.count()).toBe(before);
  });
  it.each([
    'duplicate',
    'packSpace',
    'packItem',
    'relation',
    'activePack',
    'activeSpace',
    'activeFlag',
  ])('rejects invalid %s backup references atomically', async (kind) => {
    await loadDemoWorkspace();
    const bundle = await exportWorkspace();
    if (kind === 'duplicate') bundle.items.push(bundle.items[0]!);
    if (kind === 'packSpace') bundle.packs[0]!.spaceIds.push('missing');
    if (kind === 'packItem') bundle.packs[0]!.itemIds.push('missing');
    if (kind === 'relation')
      bundle.relations.push({
        id: 'rel',
        sourceId: 'missing',
        targetId: 'task-dns',
        relation: 'related',
        createdAt: '',
        createdBy: 'human',
      });
    if (kind === 'activePack') bundle.settings.activePackId = 'missing';
    if (kind === 'activeSpace') bundle.settings.activeSpaceId = 'missing';
    if (kind === 'activeFlag') bundle.packs[0]!.active = false;
    await expect(importWorkspace(JSON.stringify(bundle))).rejects.toThrow(
      'IMPORT_INVALID',
    );
    expect((await getSnapshot()).items).toHaveLength(21);
    expect((await getSnapshot()).settings?.permissions.webmcpEnabled).toBe(
      true,
    );
  });
  it('round-trips valid content while disabling imported agent access and clearing history', async () => {
    await loadDemoWorkspace();
    const bundle = await exportWorkspace();
    await clearAllLocalData();
    await importWorkspace(JSON.stringify(bundle));
    const restored = await getSnapshot();
    expect(restored.items).toEqual(bundle.items);
    expect(restored.settings?.permissions.webmcpEnabled).toBe(false);
    expect(restored.activity).toHaveLength(1);
    expect(await db.undo.count()).toBe(0);
  });
  it('initializes once when two tabs request a fresh workspace concurrently', async () => {
    await Promise.all([
      getOrInitializeDemoSnapshot(),
      getOrInitializeDemoSnapshot(),
    ]);
    expect(await db.items.count()).toBe(21);
    expect(await db.activity.count()).toBe(1);
  });
});

describe('scope and transaction regressions', () => {
  async function toolsForSample() {
    await loadDemoWorkspace();
    const tools = new Map<
      string,
      { execute: (args: unknown) => Promise<Record<string, unknown>> }
    >();
    (globalThis as { document?: unknown }).document = {
      modelContext: {
        registerTool: (tool: {
          name: string;
          execute: (args: unknown) => Promise<Record<string, unknown>>;
        }) => {
          tools.set(tool.name, tool);
        },
      },
    };
    await registerCompassTools(demoSettings);
    return tools;
  }
  it('does not broaden an individual-item Pack to its entire Space or excluded types', async () => {
    const tools = await toolsForSample();
    const pack = await createPack(
      {
        name: 'One note',
        description: '',
        spaceIds: [],
        itemIds: ['note-readiness'],
        allowedTypes: ['note'],
      },
      true,
    );
    expect(pack.active).toBe(true);
    const broad = await tools
      .get('create_context_pack')!
      .execute({
        name: 'New',
        description: '',
        spaceIds: ['space-atlas'],
        itemIds: [],
        allowedTypes: ['note'],
      });
    expect(broad).toMatchObject({ ok: false });
    const type = await tools
      .get('create_context_pack')!
      .execute({
        name: 'New',
        description: '',
        spaceIds: [],
        itemIds: ['note-readiness'],
        allowedTypes: ['task'],
      });
    expect(type).toMatchObject({ ok: false, code: 'TYPE_PERMISSION_DENIED' });
    const search = await tools
      .get('search_personal_context')!
      .execute({ query: 'launch', types: ['task'] });
    expect(search).toMatchObject({ ok: true, results: [] });
  });
  it('keeps writes and permission revocation serialized and returns bounded errors', async () => {
    const tools = await toolsForSample();
    const revoked = updateSettings({
      permissions: { ...demoSettings.permissions, writeEnabled: false },
    });
    const write = tools
      .get('complete_task')!
      .execute({ id: 'task-dns', completed: true });
    await revoked;
    expect(await write).toMatchObject({
      ok: false,
      code: 'WRITE_PERMISSION_DENIED',
    });
    expect((await db.items.get('task-dns'))?.completed).toBe(false);
    await updateSettings({ permissions: demoSettings.permissions });
    expect(
      await tools
        .get('link_personal_items')!
        .execute({
          sourceId: 'task-dns',
          targetId: 'task-dns',
          relation: 'related',
        }),
    ).toMatchObject({ ok: false, code: 'OPERATION_FAILED' });
  });
});
