import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  activatePack, completeTask, createItem, createPack, createSpace, db, linkItems,
  startEmptyWorkspace, undoActivity, updateSettings,
} from '@/lib/repository';
import { registerCompassTools, unregisterCompassTools } from '@/lib/webmcp';

type Tool = { name: string; execute: (args: unknown) => Promise<{ ok: boolean; spaces: Record<string, unknown>[]; activity: { id: string }[] }> };
const permissions = {
  webmcpEnabled: true, readEnabled: true, writeEnabled: false,
  allowedTypes: { note: true, task: true, bookmark: true, snippet: true },
};
async function toolsForTest() {
  const tools = new Map<string, Tool>();
  (globalThis as { document?: unknown }).document = {
    modelContext: { registerTool: (tool: Tool) => { tools.set(tool.name, tool); } },
  };
  await updateSettings({ permissions });
  await registerCompassTools({ permissions });
  return tools;
}
beforeEach(async () => {
  unregisterCompassTools();
  db.close();
  await db.delete();
  await db.open();
  delete (globalThis as { document?: unknown }).document;
  await startEmptyWorkspace();
});

describe('live Context Pack read boundaries', () => {
  it('shows parent identity but not its description for an item-only Pack', async () => {
    const space = await createSpace('Parent', 'SYNTHETIC_PRIVATE_DESCRIPTION');
    const visible = await createItem({ type: 'note', spaceId: space.id, title: 'Shared', body: '', tags: [] });
    const hidden = await createItem({ type: 'note', spaceId: space.id, title: 'Hidden', body: '', tags: [] });
    const one = await createPack({ name: 'One', description: '', spaceIds: [], itemIds: [visible.id], allowedTypes: ['note'] });
    const whole = await createPack({ name: 'Whole', description: '', spaceIds: [space.id], itemIds: [], allowedTypes: ['note'] });
    await activatePack(one.id);
    const tools = await toolsForTest();
    const listed = await tools.get('list_spaces')!.execute({ includeCounts: true });
    expect(listed.spaces).toContainEqual(expect.objectContaining({ id: space.id, name: 'Parent', itemCount: 1 }));
    expect(JSON.stringify(listed)).not.toContain('SYNTHETIC_PRIVATE_DESCRIPTION');
    expect(await tools.get('get_personal_item')!.execute({ id: hidden.id })).toMatchObject({ ok: false, code: 'ITEM_NOT_FOUND' });
    await activatePack(whole.id);
    expect(await tools.get('list_spaces')!.execute({})).toMatchObject({ spaces: [expect.objectContaining({ id: space.id, description: 'SYNTHETIC_PRIVATE_DESCRIPTION' })] });
  });

  it('projects linked activity using current scope and redacts old undo messages', async () => {
    const space = await createSpace('Shared', '');
    const privateSpace = await createSpace('Other', '');
    const source = await createItem({ type: 'note', spaceId: space.id, title: 'Source', body: '', tags: [] });
    const target = await createItem({ type: 'note', spaceId: privateSpace.id, title: 'SYNTHETIC_PRIVATE_TARGET', body: '', tags: [] });
    await linkItems(source.id, target.id, 'related', 'human');
    const entry = (await db.activity.toArray()).find((row) => row.operation === 'linked items')!;
    const both = await createPack({ name: 'Both', description: '', spaceIds: [], itemIds: [source.id, target.id], allowedTypes: ['note'] });
    const one = await createPack({ name: 'One', description: '', spaceIds: [], itemIds: [source.id], allowedTypes: ['note'] });
    await activatePack(both.id);
    const tools = await toolsForTest();
    const list = () => tools.get('list_recent_activity')!.execute({ limit: 50 });
    expect(JSON.stringify(await list())).toContain('SYNTHETIC_PRIVATE_TARGET');
    await activatePack(one.id);
    expect(JSON.stringify(await list())).not.toContain('SYNTHETIC_PRIVATE_TARGET');
    await undoActivity(entry.id);
    expect(JSON.stringify(await list())).not.toContain('SYNTHETIC_PRIVATE_TARGET');
    expect((await db.activity.toArray()).some((row) => row.result.includes('SYNTHETIC_PRIVATE_TARGET'))).toBe(true);
  });

  it('redacts flattened legacy link and undo results without reference metadata', async () => {
    const space = await createSpace('Shared', '');
    const source = await createItem({ type: 'note', spaceId: space.id, title: 'Source', body: '', tags: [] });
    const pack = await createPack({ name: 'One', description: '', spaceIds: [], itemIds: [source.id], allowedTypes: ['note'] });
    await activatePack(pack.id);
    for (const [id, operation] of [['legacy-link', 'linked items'], ['legacy-undo', 'undid action']] as const) {
      await db.activity.put({ id, timestamp: '2099-01-01T00:00:00.000Z', actor: 'human', tool: 'human_link_items', operation, itemId: source.id, itemTitle: source.title, result: 'SYNTHETIC_LEGACY_SECRET', status: 'success' });
    }
    const tools = await toolsForTest();
    const activity = await tools.get('list_recent_activity')!.execute({ limit: 50 });
    expect(activity.activity.some((row: { id: string }) => row.id === 'legacy-link')).toBe(true);
    expect(JSON.stringify(activity)).not.toContain('SYNTHETIC_LEGACY_SECRET');
  });

  it('rechecks target type access for a retained activity tool', async () => {
    const space = await createSpace('Scope', '');
    const source = await createItem({ type: 'note', spaceId: space.id, title: 'Source', body: '', tags: [] });
    const target = await createItem({ type: 'task', spaceId: space.id, title: 'SYNTHETIC_TASK_TITLE', body: '', tags: [] });
    await linkItems(source.id, target.id, 'related', 'agent', 'link_personal_items');
    const pack = await createPack({ name: 'Both', description: '', spaceIds: [], itemIds: [source.id, target.id], allowedTypes: ['note', 'task'] });
    await activatePack(pack.id);
    const tools = await toolsForTest();
    const list = () => tools.get('list_recent_activity')!.execute({ limit: 50 });
    expect(JSON.stringify(await list())).toContain('SYNTHETIC_TASK_TITLE');
    await updateSettings({ permissions: { ...permissions, allowedTypes: { ...permissions.allowedTypes, task: false } } });
    expect(JSON.stringify(await list())).not.toContain('SYNTHETIC_TASK_TITLE');
  });

  it('keeps single-item undo details when the item is still shared', async () => {
    const space = await createSpace('Scope', '');
    const task = await createItem({ type: 'task', spaceId: space.id, title: 'Shared task', body: '', tags: [] });
    await completeTask(task.id, true);
    const completion = (await db.activity.toArray()).find((row) => row.operation === 'completed task')!;
    await undoActivity(completion.id);
    const pack = await createPack({ name: 'Task', description: '', spaceIds: [], itemIds: [task.id], allowedTypes: ['task'] });
    await activatePack(pack.id);
    const tools = await toolsForTest();
    const activity = await tools.get('list_recent_activity')!.execute({ limit: 50 });
    expect(JSON.stringify(activity)).toContain('Undid: Completed');
    expect(JSON.stringify(activity)).toContain('Shared task');
  });
});
