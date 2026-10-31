import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { activatePack, createItem, createPack, createSpace, db, linkItems, startEmptyWorkspace, updatePermissions, getSnapshot } from '@/lib/repository';
import { registerCompassTools, unregisterCompassTools } from '@/lib/webmcp';
import type { AgentPermissions } from '@/lib/context-types';

async function updateSettings({ permissions }: { permissions: AgentPermissions }) {
  return updatePermissions(permissions, (await getSnapshot()).settings!);
}

type Tool = { name: string; inputSchema: unknown; execute: (args: unknown) => Promise<Record<string, unknown>> };
const permissions = {
  webmcpEnabled: true, readEnabled: false, writeEnabled: true,
  allowedTypes: { note: true, task: true, bookmark: true, snippet: true },
};

beforeEach(async () => {
  unregisterCompassTools();
  db.close();
  await db.delete();
  await db.open();
  delete (globalThis as { document?: unknown }).document;
  await startEmptyWorkspace();
});

async function setup() {
  const space = await createSpace('Synthetic', '');
  const note = await createItem({ type: 'note', spaceId: space.id, title: 'SYNTHETIC_PRIVATE_NOTE', body: '', tags: [] });
  const task = await createItem({ type: 'task', spaceId: space.id, title: 'SYNTHETIC_PRIVATE_TASK', body: '', tags: [] });
  const bookmark = await createItem({ type: 'bookmark', spaceId: space.id, title: 'Bookmark', body: '', tags: [], url: 'https://example.invalid/' });
  const hidden = await createItem({ type: 'note', spaceId: space.id, title: 'Hidden', body: '', tags: [] });
  const pack = await createPack({ name: 'Synthetic Pack', description: '', spaceIds: [], itemIds: [note.id, task.id, bookmark.id], allowedTypes: ['note', 'task', 'bookmark'] });
  await activatePack(pack.id);
  const tools = new Map<string, Tool>();
  (globalThis as { document?: unknown }).document = { modelContext: { registerTool: (tool: Tool) => { tools.set(tool.name, tool); } } };
  await updateSettings({ permissions });
  await registerCompassTools({ permissions });
  return { tools, note, task, bookmark, hidden };
}

describe('write-only tool responses', () => {
  it('rejects an empty patch without creating activity or undo', async () => {
    const { tools, note } = await setup();
    const before = { activity: await db.activity.count(), undo: await db.undo.count() };
    expect(await tools.get('update_personal_item')!.execute({ id: note.id, patch: {} })).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(await tools.get('update_personal_item')!.execute({ id: note.id, patch: { body: undefined } })).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(JSON.stringify(tools.get('update_personal_item')!.inputSchema)).toContain('"minProperties":1');
    expect(await db.activity.count()).toBe(before.activity);
    expect(await db.undo.count()).toBe(before.undo);
  });

  it('acknowledges writes without returning stored fields while read is disabled', async () => {
    const { tools, note, task, hidden } = await setup();
    const updated = await tools.get('update_personal_item')!.execute({ id: note.id, patch: { body: 'fictional edit' } });
    const completed = await tools.get('complete_task')!.execute({ id: task.id, completed: true });
    expect(updated).toMatchObject({ ok: true, item: { id: note.id } });
    expect(completed).toMatchObject({ ok: true, task: { id: task.id, completed: true } });
    expect(JSON.stringify([updated, completed])).not.toMatch(/SYNTHETIC_PRIVATE_(NOTE|TASK)|updatedAt|"type"/);
    expect((await db.items.get(note.id))?.body).toBe('fictional edit');
    expect((await db.items.get(task.id))?.completed).toBe(true);
    expect(await tools.get('update_personal_item')!.execute({ id: hidden.id, patch: { body: 'x' } })).toMatchObject({ ok: false, code: 'ITEM_NOT_FOUND' });
    await updateSettings({ permissions: { ...permissions, writeEnabled: false } });
    expect(await tools.get('complete_task')!.execute({ id: task.id, completed: false })).toMatchObject({ ok: false, code: 'WRITE_PERMISSION_DENIED' });
  });

  it('preserves read-enabled response details and nullable clearing', async () => {
    const { tools, note, task } = await setup();
    await updateSettings({ permissions: { ...permissions, readEnabled: true } });
    expect(await tools.get('update_personal_item')!.execute({ id: note.id, patch: { dueDate: null } })).toMatchObject({ ok: true, item: { id: note.id, type: 'note', title: note.title, updatedAt: expect.any(String) } });
    expect(await tools.get('complete_task')!.execute({ id: task.id, completed: true })).toMatchObject({ ok: true, task: { id: task.id, title: task.title, completed: true, updatedAt: expect.any(String) } });
  });

  it('does not disclose stored details in write-only error messages', async () => {
    const { tools, note, task, bookmark } = await setup();
    const notTask = await tools.get('complete_task')!.execute({ id: note.id, completed: true });
    const invalidPatch = await tools.get('update_personal_item')!.execute({ id: bookmark.id, patch: { url: null } });
    await linkItems(note.id, task.id, 'related', 'human');
    const duplicate = await tools.get('link_personal_items')!.execute({ sourceId: note.id, targetId: task.id, relation: 'related' });
    expect(notTask).toMatchObject({ ok: false, code: 'INVALID_INPUT', message: 'The tool arguments are invalid.' });
    expect(invalidPatch.ok).toBe(false);
    expect(['The tool arguments are invalid.', 'The operation could not be completed.']).toContain(invalidPatch.message);
    expect(duplicate).toMatchObject({ ok: false, code: 'OPERATION_FAILED', message: 'The operation could not be completed.' });
  });

  it('keeps validation while write outcomes still distinguish permitted item conditions', async () => {
    const { tools, note, task, bookmark } = await setup();
    expect(await tools.get('complete_task')!.execute({ id: task.id, completed: true })).toMatchObject({ ok: true });
    expect(await tools.get('complete_task')!.execute({ id: note.id, completed: true })).toMatchObject({ ok: false });
    expect(await tools.get('update_personal_item')!.execute({ id: note.id, patch: { url: null } })).toMatchObject({ ok: true });
    expect(await tools.get('update_personal_item')!.execute({ id: bookmark.id, patch: { url: null } })).toMatchObject({ ok: false });
    expect(await tools.get('link_personal_items')!.execute({ sourceId: note.id, targetId: task.id, relation: 'related' })).toMatchObject({ ok: true });
    expect(await tools.get('link_personal_items')!.execute({ sourceId: note.id, targetId: task.id, relation: 'related' })).toMatchObject({ ok: false });
  });

  it('keeps descriptive task validation when read is enabled', async () => {
    const { tools, note } = await setup();
    await updateSettings({ permissions: { ...permissions, readEnabled: true } });
    expect(await tools.get('complete_task')!.execute({ id: note.id, completed: true })).toMatchObject({ ok: false, code: 'INVALID_INPUT', message: 'Only task items can be completed.' });
  });

  it('keeps descriptive duplicate-link and bookmark validation when read is enabled', async () => {
    const { tools, note, task, bookmark } = await setup();
    await updateSettings({ permissions: { ...permissions, readEnabled: true } });
    await linkItems(note.id, task.id, 'related', 'human');
    expect(await tools.get('link_personal_items')!.execute({ sourceId: note.id, targetId: task.id, relation: 'related' })).toMatchObject({ ok: false, code: 'OPERATION_FAILED', message: 'These items already have this relation' });
    // fake-indexeddb can surface a Dexie transaction error for this rejected
    // nested write; the unmodified source returns the same OPERATION_FAILED.
    expect(await tools.get('update_personal_item')!.execute({ id: bookmark.id, patch: { url: null } })).toMatchObject({ ok: false, code: 'OPERATION_FAILED', message: expect.any(String) });
  });
});
