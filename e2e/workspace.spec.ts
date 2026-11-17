import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(() => expect(errors).toEqual([]));
const nav = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name, exact: true })
    .click();
async function ready(page: Page) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your workspace' }),
  ).toBeVisible();
}
async function add(page: Page, type: string, title: string) {
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type', { exact: true }).selectOption(type);
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog
    .getByLabel('Body', { exact: true })
    .fill('A useful saved record.');
  if (type === 'bookmark')
    await dialog.getByLabel('Bookmark URL').fill('https://example.com/docs');
  if (type === 'snippet')
    await dialog.getByLabel('Snippet language').fill('typescript');
  await dialog.getByRole('button', { name: 'Save item' }).click();
  await expect(dialog).not.toBeVisible();
}
const openItem = (page: Page, title: string) =>
  page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .click();

test('entry documents require private revalidation and reference available client assets', async ({ request }) => {
  const assets = new Set<string>();
  const checkPolicy = (policy: string | undefined) => {
    expect(policy?.split(',').map((directive) => directive.trim())).toEqual(
      expect.arrayContaining(['private', 'no-cache', 'max-age=0', 'must-revalidate']),
    );
    expect(policy).not.toMatch(/\b(?:s-maxage|no-store)\b/);
  };
  for (const route of ['/', '/docs']) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request.get(route);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      checkPolicy(response.headers()['cache-control']);
      const html = await response.text();
      for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (/^\/_next\/static\/.*\.(?:js|css)$/.test(match[1])) assets.add(match[1]);
      }
    }
    const head = await request.head(route);
    expect(head.status()).toBe(200);
    checkPolicy(head.headers()['cache-control']);
    const rsc = await request.get(`${route}?_rsc=cache-policy-check`, { headers: { RSC: '1' } });
    expect(rsc.status()).toBe(200);
    expect(rsc.headers()['content-type']).toContain('text/x-component');
    checkPolicy(rsc.headers()['cache-control']);
  }
  expect([...assets].some((asset) => asset.endsWith('.js'))).toBe(true);
  expect([...assets].some((asset) => asset.endsWith('.css'))).toBe(true);
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
    expect(response.headers()['content-type'], asset).toMatch(
      asset.endsWith('.css') ? /text\/css/ : /javascript/,
    );
    expect((await response.body()).length, asset).toBeGreaterThan(0);
  }
  expect((await request.get('/_next/static/chunks/compass-missing-delivery-asset.js')).status()).toBe(404);
});

test('own workspace: all four types edit, task state, named links, Pack and reload', async ({
  page,
}) => {
  await ready(page);
  await nav(page, 'Settings');
  await page.getByRole('button', { name: 'Clear data', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Clear local data', exact: true })
    .click();
  await expect(
    page.getByRole('switch', { name: 'WebMCP enabled' }),
  ).not.toBeChecked();
  await nav(page, 'Spaces');
  await page.getByRole('button', { name: 'Create Space', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: true })
    .fill('Personal work');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create Space', exact: true })
    .click();
  await page.getByRole('button', { name: 'Rename Personal work' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: true })
    .fill('My work');
  await page.getByRole('button', { name: 'Save name' }).click();
  await nav(page, 'Dashboard');
  for (const type of ['note', 'task', 'bookmark', 'snippet']) {
    await add(page, type, `My ${type}`);
    await openItem(page, `My ${type}`);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Edit', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByLabel('Title', { exact: true })
      .fill(`Updated ${type}`);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Save item' })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: `Updated ${type}`, exact: true }),
    ).toBeVisible();
  }
  await openItem(page, 'Updated task');
  await page
    .getByRole('button', { name: 'Complete task', exact: true })
    .click();
  await openItem(page, 'Updated task');
  await page.getByRole('button', { name: 'Reopen task', exact: true }).click();
  await openItem(page, 'Updated note');
  await page.getByRole('button', { name: 'Link item', exact: true }).click();
  await page.getByLabel('Link to item').selectOption({ label: 'Updated task' });
  await page.getByRole('button', { name: 'Save link' }).click();
  await openItem(page, 'Updated note');
  await expect(page.getByRole('dialog')).toContainText('Updated task');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await nav(page, 'Context Packs');
  await page.getByRole('button', { name: 'Create Pack', exact: true }).click();
  await page.getByLabel('Pack name').fill('Selected notes');
  await page
    .getByRole('dialog')
    .getByLabel('Description')
    .fill('Only one note.');
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /Updated note/ })
    .check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create Pack', exact: true })
    .click();
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Selected notes', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('1 accessible items', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Updated bookmark', exact: true }),
  ).toBeVisible();
});

test('downloaded backup restores content; bad import and canceled reset preserve data', async ({
  page,
}) => {
  await ready(page);
  await add(page, 'note', 'Backup keeps this');
  await nav(page, 'Settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workspace' }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, 'utf8');
  expect(
    JSON.parse(content).items.some(
      (item: { title: string }) => item.title === 'Backup keeps this',
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel' })
    .click();
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":1}'),
    });
  await page
    .getByRole('button', { name: 'Import backup', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('IMPORT_INVALID');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel' })
    .click();
  await nav(page, 'Dashboard');
  await expect(
    page.getByRole('heading', { name: 'Backup keeps this' }),
  ).toBeVisible();
  await nav(page, 'Settings');
  await page.getByRole('button', { name: 'Clear data', exact: true }).click();
  await page
    .getByRole('button', { name: 'Clear local data', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(content),
    });
  await page
    .getByRole('button', { name: 'Import backup', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Backup keeps this' }),
  ).toBeVisible();
  await expect(
    page.getByRole('switch', { name: 'WebMCP enabled' }),
  ).not.toBeChecked();
});

test('same-origin tabs update and stale editors cannot overwrite newer content', async ({
  page,
  context,
}) => {
  await ready(page);
  await add(page, 'note', 'Shared across tabs');
  const second = await context.newPage();
  await ready(second);
  await openItem(second, 'Shared across tabs');
  await second.getByRole('button', { name: 'Edit', exact: true }).click();
  await openItem(page, 'Shared across tabs');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title').fill('Newer saved title');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(
    second.getByRole('heading', { name: 'Newer saved title', exact: true }),
  ).toBeAttached();
  await second.getByRole('dialog').getByLabel('Title').fill('Stale overwrite');
  await second.getByRole('button', { name: 'Save item' }).click();
  await expect(second.getByRole('dialog')).toContainText(
    'changed while you were editing',
  );
  await second.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('switch', { name: 'Allow write' }).click();
  await expect(
    second.getByRole('switch', { name: 'Allow write' }),
  ).not.toBeChecked();
});

test('mobile navigation, scoped Pack form and ordinary-browser use', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  for (const name of [
    'Spaces',
    'Context Packs',
    'Activity',
    'Settings',
    'Dashboard',
  ]) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: name === 'Dashboard' ? 'Your workspace' : name,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_DIR)
    await page.screenshot({
      path: `${process.env.CAPTURE_DIR}/compass-mobile.png`,
    });
});

test('unavailable IndexedDB shows a recoverable error', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Storage disabled', 'SecurityError');
    };
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Local storage could not be opened' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry', exact: true }),
  ).toBeVisible();
});

test('ten simulated WebMCP tools change visible state, then retained write is denied', async ({
  page,
}) => {
  await page.addInitScript(() => {
    type Tool = {
      name: string;
      execute: (args: unknown) => Promise<Record<string, unknown>>;
    };
    const tools = new Map<string, Tool>();
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool(tool: Tool, options?: { signal?: AbortSignal }) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          });
        },
      },
    });
    Object.assign(window, { compassTestTools: tools });
  });
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'View 10 exposed tools' }),
  ).toBeVisible();
  if (process.env.CAPTURE_DIR)
    await page.screenshot({
      path: `${process.env.CAPTURE_DIR}/compass-desktop.png`,
    });
  const results = await page.evaluate(async () => {
    type Tool = {
      execute: (args: unknown) => Promise<Record<string, unknown>>;
    };
    const tools = (window as unknown as { compassTestTools: Map<string, Tool> })
      .compassTestTools;
    const call = (name: string, args = {}) => tools.get(name)!.execute(args);
    const results = [
      await call('get_active_context'),
      await call('list_spaces'),
      await call('search_personal_context', { query: 'launch' }),
      await call('get_personal_item', { id: 'task-dns' }),
    ];
    const created = await call('create_personal_item', {
      type: 'task',
      spaceId: 'space-atlas',
      title: 'Browser tool task',
      body: 'Visible task',
      tags: [],
    });
    results.push(created);
    const item = created.item as { id: string };
    results.push(
      await call('update_personal_item', {
        id: item.id,
        patch: { body: 'Updated through tool' },
      }),
    );
    results.push(await call('complete_task', { id: item.id, completed: true }));
    results.push(
      await call('link_personal_items', {
        sourceId: item.id,
        targetId: 'task-dns',
        relation: 'related',
      }),
    );
    results.push(
      await call('create_context_pack', {
        name: 'Agent review',
        description: '',
        spaceIds: [],
        itemIds: [item.id],
        allowedTypes: ['task'],
      }),
    );
    results.push(await call('list_recent_activity'));
    Object.assign(window, {
      compassRetainedWrite: tools.get('create_personal_item'),
    });
    return results;
  });
  expect(results).toHaveLength(10);
  for (const result of results)
    expect(result.ok, JSON.stringify(result)).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Browser tool task', exact: true }),
  ).toBeVisible();
  await nav(page, 'Activity');
  const packRow = page
    .locator('div')
    .filter({
      has: page.getByText('Created Context Pack “Agent review”', {
        exact: true,
      }),
    })
    .filter({ has: page.getByRole('button', { name: 'Undo', exact: true }) })
    .last();
  await packRow.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page
      .getByText('Created Context Pack “Agent review” — undone by human', {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole('switch', { name: 'Allow write' }).click();
  await expect(
    page.getByRole('button', { name: 'View 5 exposed tools' }),
  ).toBeVisible();
  const denied = await page.evaluate(() =>
    (
      window as unknown as {
        compassRetainedWrite: { execute: (args: unknown) => Promise<unknown> };
      }
    ).compassRetainedWrite.execute({
      type: 'note',
      spaceId: 'space-atlas',
      title: 'Should not be created',
      body: '',
      tags: [],
    }),
  );
  expect(denied).toMatchObject({ ok: false, code: 'WRITE_PERMISSION_DENIED' });
});
