import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { atlasPack, demoItems, demoSettings } from '@/lib/seed';
import { assertAgentAccess, itemIsInPack } from '@/lib/permissions';
import { rankItems } from '@/lib/search';
import {
  completeTask, db, getSnapshot, importWorkspace, itemInputSchema, loadDemoWorkspace,
  undoActivity, updateSettings,
} from '@/lib/repository';
import { registerContextDockTools, unregisterContextDockTools } from '@/lib/webmcp';

beforeEach(async () => {
  unregisterContextDockTools();
  db.close();
  await db.delete();
  await db.open();
  delete (globalThis as { document?: unknown }).document;
});

describe('permissions and Context Pack scope', () => {
  it('enforces read, write, and type gates inside trusted settings', () => {
    expect(assertAgentAccess(demoSettings, atlasPack, 'read')).toBeNull();
    expect(assertAgentAccess({ ...demoSettings, permissions: { ...demoSettings.permissions, writeEnabled: false } }, atlasPack, 'write')).toBe('WRITE_PERMISSION_DENIED');
    expect(assertAgentAccess({ ...demoSettings, permissions: { ...demoSettings.permissions, allowedTypes: { ...demoSettings.permissions.allowedTypes, note: false } } }, atlasPack, 'read', 'note')).toBe('TYPE_PERMISSION_DENIED');
  });

  it('does not include records outside an active Pack', () => {
    const item = { ...demoItems[0]!, spaceId: 'private-space' };
    expect(itemIsInPack(item, atlasPack)).toBe(false);
    expect(itemIsInPack(demoItems[0]!, atlasPack)).toBe(true);
  });
});

describe('deterministic search and validation', () => {
  it('ranks exact title ahead of body-only matches', () => {
    const ranked = rankItems(demoItems, [{ id: 'space-atlas', name: 'Project Atlas', description: '', createdAt: '', updatedAt: '' }], { query: 'Launch Readiness' });
    expect(ranked[0]?.item.id).toBe('note-readiness');
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it('rejects unknown item fields and unsafe bookmark URLs', () => {
    expect(itemInputSchema.safeParse({ type: 'note', spaceId: 'x', title: 'Hi', body: '', tags: [], injected: true }).success).toBe(false);
    expect(itemInputSchema.safeParse({ type: 'bookmark', spaceId: 'x', title: 'Bad', body: '', tags: [], url: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('rejects malformed imports without replacing current state', async () => {
    await loadDemoWorkspace();
    const before = (await getSnapshot()).items.length;
    await expect(importWorkspace('{"version":1,"__proto__":{"polluted":true}}')).rejects.toThrow('IMPORT_INVALID');
    expect((await getSnapshot()).items.length).toBe(before);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe('writes, task completion, and undo', () => {
  it('restores task state from undo history', async () => {
    await loadDemoWorkspace();
    const task = await completeTask('task-dns', true, 'agent', 'complete_task');
    expect(task.completed).toBe(true);
    const activity = (await getSnapshot()).activity.find((entry) => entry.itemId === 'task-dns' && entry.actor === 'agent');
    expect(activity?.undoId).toBeTruthy();
    await undoActivity(activity!.id);
    expect((await db.items.get('task-dns'))?.completed).toBe(false);
  });
});

describe('WebMCP registration lifecycle and integration', () => {
  it('waits briefly for a browser that injects Model Context after hydration', async () => {
    const registrations: string[] = [];
    const pending = registerContextDockTools(demoSettings, {
      contextTimeoutMs: 100,
      pollIntervalMs: 10,
    });
    globalThis.setTimeout(() => {
      (globalThis as { document?: unknown }).document = {
        modelContext: {
          registerTool: (tool: { name: string }) => registrations.push(tool.name),
        },
      };
    }, 15);
    const result = await pending;
    expect(result.supported).toBe(true);
    expect(result.registered).toContain('get_active_context');
    expect(registrations).toContain('create_personal_item');
  });

  it('aborts old registrations and changes exposed write tools', async () => {
    const registrations: Array<{ tool: { name: string; execute: (args: unknown) => Promise<unknown> }; signal?: AbortSignal }> = [];
    (globalThis as { document?: unknown }).document = { modelContext: { registerTool: (tool: { name: string; execute: (args: unknown) => Promise<unknown> }, options?: { signal?: AbortSignal }) => { registrations.push({ tool, signal: options?.signal }); } } };
    const first = await registerContextDockTools(demoSettings);
    expect(first.registered).toContain('create_personal_item');
    const firstSignal = registrations[0]?.signal;
    const restricted = { ...demoSettings, permissions: { ...demoSettings.permissions, writeEnabled: false } };
    const second = await registerContextDockTools(restricted);
    expect(firstSignal?.aborted).toBe(true);
    expect(second.registered).not.toContain('create_personal_item');
    expect(second.registered).toContain('search_personal_context');
  });

  it('searches, creates, audits, then denies after write is disabled', async () => {
    await loadDemoWorkspace();
    const tools = new Map<string, { execute: (args: unknown) => Promise<Record<string, unknown>> }>();
    (globalThis as { document?: unknown }).document = { modelContext: { registerTool: (tool: { name: string; execute: (args: unknown) => Promise<Record<string, unknown>> }) => { tools.set(tool.name, tool); } } };
    await registerContextDockTools(demoSettings);
    const search = await tools.get('search_personal_context')!.execute({ query: 'launch blockers', limit: 5 });
    expect(search.ok).toBe(true);
    const before = (await getSnapshot()).items.length;
    const created = await tools.get('create_personal_item')!.execute({ type: 'task', spaceId: 'space-atlas', title: 'Validate DNS propagation', body: 'Confirm global resolution before the launch window.', tags: ['dns', 'launch'], priority: 'high' });
    expect(created.ok).toBe(true);
    expect((await getSnapshot()).items.length).toBe(before + 1);
    expect((await getSnapshot()).activity.some((entry) => entry.actor === 'agent' && entry.tool === 'create_personal_item')).toBe(true);
    await updateSettings({ permissions: { ...demoSettings.permissions, writeEnabled: false } });
    const denied = await tools.get('create_personal_item')!.execute({ type: 'task', spaceId: 'space-atlas', title: 'Should not exist', body: '', tags: [] });
    expect(denied).toMatchObject({ ok: false, code: 'WRITE_PERMISSION_DENIED' });
    expect((await getSnapshot()).items.length).toBe(before + 1);
  });
});
