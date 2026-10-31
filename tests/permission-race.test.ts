import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, exportWorkspace, getOrInitializeDemoSnapshot, getSnapshot, importBundleSchema, importWorkspace, loadDemoWorkspace, startEmptyWorkspace, updatePermissions, updateSettings } from '@/lib/repository';
import { registerCompassTools, unregisterCompassTools } from '@/lib/webmcp';

beforeEach(async () => {
  unregisterCompassTools();
  db.close();
  await db.delete();
  await db.open();
  delete (globalThis as { document?: unknown }).document;
  await loadDemoWorkspace();
});

describe('permission changes from stale settings', () => {
  it('retains a read revocation and denies a retained handler when another switch changes from the same rendered snapshot', async () => {
    const settings = (await getSnapshot()).settings!;
    const tools = new Map<string, { name: string; execute: (args: unknown) => Promise<Record<string, unknown>> }>();
    (globalThis as { document?: unknown }).document = { modelContext: { registerTool: (tool: { name: string; execute: (args: unknown) => Promise<Record<string, unknown>> }) => tools.set(tool.name, tool) } };
    await registerCompassTools(settings);
    const read = tools.get('search_personal_context')!;
    expect((await read.execute({ query: 'launch', limit: 5 })).ok).toBe(true);
    await Promise.all([
      updatePermissions({ readEnabled: false }, settings),
      updatePermissions({ writeEnabled: false }, settings),
    ]);
    expect((await getSnapshot()).settings!.permissions).toMatchObject({ readEnabled: false, writeEnabled: false });
    expect(await read.execute({ query: 'launch', limit: 5 })).toMatchObject({ ok: false, code: 'READ_PERMISSION_DENIED' });
    await updatePermissions({ readEnabled: true }, (await getSnapshot()).settings!);
    expect((await read.execute({ query: 'launch', limit: 5 })).ok).toBe(true);
  });

  it('merges independent type revocations and respects stale explicit off intent', async () => {
    const settings = (await getSnapshot()).settings!;
    await updatePermissions({ allowedTypes: { note: false } }, settings);
    await updatePermissions({ allowedTypes: { task: false } }, settings);
    await expect(updatePermissions({ allowedTypes: { note: false } }, settings)).rejects.toThrow('Permissions changed');
    expect((await getSnapshot()).settings!.permissions.allowedTypes).toEqual({ note: false, task: false, bookmark: true, snippet: true });
    await updateSettings({ activeSpaceId: 'space-atlas' });
    expect((await getSnapshot()).settings!.permissions.allowedTypes.note).toBe(false);
  });

  it.each(['clear', 'import'] as const)('rejects a pending pre-%s enable and accepts an explicit enable afterward', async (replacement) => {
    const backup = JSON.stringify(await exportWorkspace());
    const captured = (await getSnapshot()).settings!;
    if (replacement === 'clear') await startEmptyWorkspace();
    else await importWorkspace(backup);
    await expect(updatePermissions({ webmcpEnabled: true }, captured)).rejects.toThrow('workspace changed');
    const current = (await getSnapshot()).settings!;
    expect(current.permissions.webmcpEnabled).toBe(false);
    await updatePermissions({ webmcpEnabled: true }, current);
    expect((await getSnapshot()).settings!.permissions.webmcpEnabled).toBe(true);
  });

  it('rejects a queued permission change after explicitly loading the sample workspace', async () => {
    const captured = (await getSnapshot()).settings!;
    await loadDemoWorkspace();
    await expect(updatePermissions({ readEnabled: false }, captured)).rejects.toThrow('workspace changed');
    expect((await getSnapshot()).settings!.permissions.readEnabled).toBe(true);
  });

  it('supports legacy settings and version 1 backups without exporting the local epoch', async () => {
    await db.table('settings').delete('workspace-generation');
    const legacy = await getOrInitializeDemoSnapshot();
    expect(legacy.settings?.workspaceEpoch).toEqual(expect.any(String));
    await updatePermissions({ readEnabled: false }, legacy.settings!);
    const backup = await exportWorkspace();
    expect(backup.settings).not.toHaveProperty('workspaceEpoch');
    expect(backup.settings).not.toHaveProperty('permissionVersions');
    const olderTabBackup = { ...backup, settings: await db.settings.get('settings') };
    expect(importBundleSchema.safeParse(olderTabBackup).success).toBe(true);
    await importWorkspace(JSON.stringify(backup));
    const current = (await getSnapshot()).settings!;
    expect(current.workspaceEpoch).toEqual(expect.any(String));
    expect(current.permissions).toMatchObject({ readEnabled: false, webmcpEnabled: false });
    await expect(updatePermissions({ webmcpEnabled: true }, legacy.settings!)).rejects.toThrow('workspace changed');
  });

  it('rejects a stale same-field enable even after the value changes away and back', async () => {
    let settings = (await getSnapshot()).settings!;
    await updatePermissions({ readEnabled: false }, settings);
    const staleEnable = (await getSnapshot()).settings!;
    await updatePermissions({ readEnabled: true }, staleEnable);
    settings = (await getSnapshot()).settings!;
    await updatePermissions({ readEnabled: false }, settings);
    await expect(updatePermissions({ readEnabled: true }, staleEnable)).rejects.toThrow('Permissions changed');
    expect((await getSnapshot()).settings!.permissions.readEnabled).toBe(false);
    await updatePermissions({ readEnabled: true }, (await getSnapshot()).settings!);
    expect((await getSnapshot()).settings!.permissions.readEnabled).toBe(true);
  });
});
