import { test, expect, type Page } from '@playwright/test';

type NativeTool = {
  name: string;
  title: string;
  inputSchema: string | Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  origin: string;
};
type NativeContext = {
  getTools: () => Promise<NativeTool[]>;
  executeTool: (
    tool: NativeTool,
    input: string | Record<string, unknown>,
  ) => Promise<unknown>;
};
type Result = {
  ok?: boolean;
  code?: string;
  nativeError?: string;
  item?: { id: string };
  results?: { id: string }[];
};
const names = [
  'complete_task',
  'create_context_pack',
  'create_personal_item',
  'get_active_context',
  'get_personal_item',
  'link_personal_items',
  'list_recent_activity',
  'list_spaces',
  'search_personal_context',
  'update_personal_item',
];
const errors = new WeakMap<Page, string[]>();
const nav = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name, exact: true })
    .click();
const itemInput = {
  type: 'task',
  spaceId: 'space-atlas',
  title: 'Native browser task',
  body: 'Fictional native test content',
  tags: [],
};
async function call(
  page: Page,
  name: string,
  input: Record<string, unknown> = {},
): Promise<Result> {
  return page.evaluate(
    async ({ name, input }) => {
      const native = document.modelContext as unknown as NativeContext;
      const tool = (await native.getTools()).find((tool) => tool.name === name);
      if (!tool) throw new Error(`Native discovery did not return ${name}`);
      const major = Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
      if (![153, 154, 155].includes(major))
        throw new Error(
          `Native verification requires measured Chrome 153/154/155; found ${major}`,
        );
      try {
        const result = await native.executeTool(
          tool,
          major < 155 ? JSON.stringify(input) : input,
        );
        return (
          typeof result === 'string' ? JSON.parse(result) : result
        ) as Result;
      } catch (error) {
        return { nativeError: (error as Error).message };
      }
    },
    { name, input },
  );
}
async function toolNames(page: Page) {
  return page.evaluate(async () =>
    (await (document.modelContext as unknown as NativeContext).getTools())
      .map((tool) => tool.name)
      .sort(),
  );
}
test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeEach(async ({ page, browser }, testInfo) => {
  const entries: string[] = [];
  errors.set(page, entries);
  page.on('pageerror', (error) => entries.push(error.message));
  await testInfo.attach('browser-version', {
    body: browser.version(),
    contentType: 'text/plain',
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'View 10 exposed tools' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.modelContext?.registerTool.toString()),
  ).toContain('[native code]');
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('all ten native tools discover, mutate visible data, persist and support human Undo', async ({
  page,
}) => {
  const tools = await page.evaluate(async () =>
    (await (document.modelContext as unknown as NativeContext).getTools()).map(
      ({ name, title, inputSchema, annotations, origin }) => ({
        name,
        title,
        inputSchema,
        annotations,
        origin,
      }),
    ),
  );
  expect(tools.map((tool) => tool.name).sort()).toEqual(names);
  for (const tool of tools) {
    expect(tool.title).toBeTruthy();
    expect(
      typeof tool.inputSchema === 'string'
        ? JSON.parse(tool.inputSchema)
        : tool.inputSchema,
    ).toMatchObject({ type: 'object', additionalProperties: false });
    expect(tool.origin).toBe(new URL(page.url()).origin);
    if (
      [
        'get_active_context',
        'get_personal_item',
        'list_recent_activity',
        'list_spaces',
        'search_personal_context',
      ].includes(tool.name)
    )
      expect(tool.annotations?.readOnlyHint).toBe(true);
  }
  expect(await call(page, 'get_active_context')).toMatchObject({
    ok: true,
    accessibleItemCount: 21,
    pack: { name: 'Atlas Launch' },
  });
  expect(
    await call(page, 'list_spaces', { includeCounts: true }),
  ).toMatchObject({ ok: true, spaces: [{ id: 'space-atlas', itemCount: 21 }] });
  const search = await call(page, 'search_personal_context', {
    query: 'launch',
  });
  expect(search.ok).toBe(true);
  expect(search.results!.length).toBeGreaterThan(0);
  expect(
    await call(page, 'get_personal_item', { id: 'task-dns' }),
  ).toMatchObject({ ok: true, item: { title: 'Verify DNS configuration' } });
  const created = await call(page, 'create_personal_item', itemInput);
  expect(created.ok, JSON.stringify(created)).toBe(true);
  const id = created.item!.id;
  await expect(
    page.getByRole('heading', { name: itemInput.title, exact: true }),
  ).toBeVisible();
  expect(
    await call(page, 'update_personal_item', {
      id,
      patch: { body: 'Updated through native WebMCP' },
    }),
  ).toMatchObject({ ok: true });
  expect(
    await call(page, 'complete_task', { id, completed: true }),
  ).toMatchObject({ ok: true, task: { completed: true } });
  expect(
    await call(page, 'link_personal_items', {
      sourceId: id,
      targetId: 'task-dns',
      relation: 'related',
    }),
  ).toMatchObject({ ok: true });
  expect(
    await call(page, 'create_context_pack', {
      name: 'Native review',
      description: '',
      spaceIds: [],
      itemIds: [id],
      allowedTypes: ['task'],
    }),
  ).toMatchObject({ ok: true, pack: { name: 'Native review', active: false } });
  expect(await call(page, 'list_recent_activity')).toMatchObject({
    ok: true,
    activity: expect.arrayContaining([
      expect.objectContaining({ actor: 'agent' }),
    ]),
  });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'View 10 exposed tools' }),
  ).toBeVisible();
  expect(await call(page, 'get_personal_item', { id })).toMatchObject({
    ok: true,
    item: { body: 'Updated through native WebMCP', completed: true },
  });
  expect(await call(page, 'get_active_context')).toMatchObject({
    ok: true,
    pack: { name: 'Atlas Launch' },
  });
  await nav(page, 'Activity');
  const packRow = page
    .locator('div')
    .filter({
      has: page.getByText('Created Context Pack “Native review”', {
        exact: true,
      }),
    })
    .filter({ has: page.getByRole('button', { name: 'Undo', exact: true }) })
    .last();
  await packRow.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page
      .getByText('Created Context Pack “Native review” — undone by human', {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await nav(page, 'Context Packs');
  await expect(
    page.getByRole('heading', { name: 'Native review', exact: true }),
  ).toHaveCount(0);
});

test('invalid native inputs do not create or change stored items', async ({
  page,
}) => {
  const before = await call(page, 'get_personal_item', { id: 'task-dns' });
  const invalid: [string, Record<string, unknown>][] = [
    ...names.map(
      (name) => [name, { unknown: true }] as [string, Record<string, unknown>],
    ),
    ['search_personal_context', { query: 'launch', limit: 2.5 }],
    ['create_personal_item', { ...itemInput, title: ' ' }],
    ['update_personal_item', { id: 'task-dns', patch: { id: 'changed' } }],
    ['complete_task', { id: 'task-dns', completed: 'yes' }],
    ['get_personal_item', { id: 'missing-item' }],
  ];
  for (const [name, input] of invalid) {
    const result = await call(page, name, input);
    expect(
      result.nativeError || result.ok === false,
      `${name}: ${JSON.stringify(result)}`,
    ).toBeTruthy();
    expect(await call(page, 'get_personal_item', { id: 'task-dns' })).toEqual(
      before,
    );
    expect(await call(page, 'get_active_context')).toMatchObject({
      accessibleItemCount: 21,
    });
  }
  await expect(
    page.getByRole('heading', { name: itemInput.title, exact: true }),
  ).toHaveCount(0);
});

test('individual-item scope and live read, write and type permissions govern native tools', async ({
  page,
}) => {
  await page.evaluate(() => {
    const changes = { count: 0 };
    Object.assign(window, { compassNativeChanges: changes });
    (document.modelContext as unknown as EventTarget).addEventListener(
      'toolchange',
      () => changes.count++,
    );
  });
  await nav(page, 'Context Packs');
  await page.getByRole('button', { name: 'Create Pack', exact: true }).click();
  await page.getByLabel('Pack name').fill('Only DNS');
  await page
    .getByRole('dialog')
    .getByLabel('Description')
    .fill('Only the fictional DNS task.');
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /Verify DNS configuration/ })
    .check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create Pack', exact: true })
    .click();
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect.poll(() => toolNames(page)).toEqual(names);
  expect(await call(page, 'get_active_context')).toMatchObject({
    ok: true,
    accessibleItemCount: 1,
  });
  expect(
    await call(page, 'get_personal_item', { id: 'task-dns' }),
  ).toMatchObject({ ok: true });
  expect(
    await call(page, 'get_personal_item', { id: 'task-hosting' }),
  ).toMatchObject({ ok: false, code: 'ITEM_NOT_FOUND' });
  expect(await call(page, 'create_personal_item', itemInput)).toMatchObject({
    ok: false,
    code: 'TYPE_PERMISSION_DENIED',
  });
  await page.getByRole('button', { name: 'tasks', exact: true }).click();
  await expect.poll(() => toolNames(page)).toEqual(names);
  expect(
    await call(page, 'get_personal_item', { id: 'task-dns' }),
  ).toMatchObject({ ok: false, code: 'ITEM_NOT_FOUND' });
  await page.getByRole('button', { name: 'tasks', exact: true }).click();
  await expect.poll(() => toolNames(page)).toEqual(names);
  await expect(
    page.getByRole('button', { name: 'tasks', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            compassNativeChanges: { count: number };
          }
        ).compassNativeChanges.count,
    ),
  ).toBe(0);
  // Retain a real native discovery handle across revocation, without replacing the browser API.
  await page.evaluate(async () =>
    Object.assign(window, {
      compassRetainedNative: (
        await (document.modelContext as unknown as NativeContext).getTools()
      ).find((tool) => tool.name === 'complete_task'),
    }),
  );
  await page.getByRole('switch', { name: 'Allow write' }).click();
  await expect(
    page.getByRole('button', { name: 'View 5 exposed tools' }),
  ).toBeVisible();
  expect(await toolNames(page)).toEqual(
    names.filter((name) =>
      [
        'get_active_context',
        'get_personal_item',
        'list_recent_activity',
        'list_spaces',
        'search_personal_context',
      ].includes(name),
    ),
  );
  const retained = await page.evaluate(async () => {
    const native = document.modelContext as unknown as NativeContext;
    const tool = (window as unknown as { compassRetainedNative: NativeTool })
      .compassRetainedNative;
    const input = { id: 'task-dns', completed: true };
    try {
      const major = Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
      const result = await native.executeTool(
        tool,
        major < 155 ? JSON.stringify(input) : input,
      );
      return (
        typeof result === 'string' ? JSON.parse(result) : result
      ) as Result;
    } catch (error) {
      return { nativeError: (error as Error).message };
    }
  });
  expect(
    retained.nativeError || retained.code === 'WRITE_PERMISSION_DENIED',
  ).toBeTruthy();
  expect(
    await call(page, 'get_personal_item', { id: 'task-dns' }),
  ).toMatchObject({ item: { completed: false } });
  await page.getByRole('switch', { name: 'Allow read' }).click();
  await expect(
    page.getByRole('button', { name: 'View 1 exposed tools' }),
  ).toBeVisible();
  expect(await toolNames(page)).toEqual(['get_active_context']);
  expect(await call(page, 'get_active_context')).toMatchObject({
    ok: true,
    readEnabled: false,
    writeEnabled: false,
  });
  await page.getByRole('switch', { name: 'WebMCP enabled' }).click();
  await expect.poll(() => toolNames(page)).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'WebMCP enabled' }),
  ).not.toBeChecked();
  expect(await toolNames(page)).toEqual([]);
});

test('native registrations clean up and recover on page restoration', async ({
  page,
}, testInfo) => {
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide')),
  );
  expect(await toolNames(page)).toEqual([]);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect.poll(() => toolNames(page)).toEqual(names);
  await page.evaluate(() => {
    const events: boolean[] = [];
    Object.assign(window, { compassNativePageShows: events });
    window.addEventListener('pageshow', (event) =>
      events.push(event.persisted),
    );
  });
  await page.goto('/agents.md');
  await page.goBack({ waitUntil: 'commit' });
  await expect.poll(() => toolNames(page)).toEqual(names);
  const restored = await page.evaluate(
    () =>
      (
        window as Window & { compassNativePageShows?: boolean[] }
      ).compassNativePageShows?.includes(true) ?? false,
  );
  await testInfo.attach('navigation-restoration', {
    body: JSON.stringify({ backForwardCacheRestored: restored }),
    contentType: 'application/json',
  });
  if (!process.env.COMPASS_WEBMCP_URL) expect(restored).toBe(true);
  expect(await call(page, 'get_active_context')).toMatchObject({
    ok: true,
    accessibleItemCount: 21,
  });
});
