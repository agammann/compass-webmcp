import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = process.env.COMPASS_PROJECT_ROOT ?? process.cwd();
const modulePath = (...segments: string[]) => pathToFileURL(resolve(projectRoot, ...segments)).href;

export default defineConfig({
  resolve: {
    alias: {
      '@/lib/seed': modulePath('lib/seed.ts'),
      '@/lib/permissions': modulePath('lib/permissions.ts'),
      '@/lib/search': modulePath('lib/search.ts'),
      '@/lib/repository': modulePath('lib/repository.ts'),
      '@/lib/webmcp': modulePath('lib/webmcp.ts'),
      './context-types.ts': modulePath('lib/context-types.ts'),
      './seed.ts': modulePath('lib/seed.ts'),
      './permissions.ts': modulePath('lib/permissions.ts'),
      './search.ts': modulePath('lib/search.ts'),
      './repository.ts': modulePath('lib/repository.ts'),
      'fake-indexeddb/auto': modulePath('node_modules/fake-indexeddb/auto/index.mjs'),
      dexie: modulePath('node_modules/dexie/dist/dexie.mjs'),
      zod: modulePath('node_modules/zod/index.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    isolate: true,
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
