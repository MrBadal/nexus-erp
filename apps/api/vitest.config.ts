import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Integration tests share one disposable Postgres (started by global-setup)
    // and each test is responsible for its own tenant-scoped cleanup -- run
    // sequentially within a file so tests can't race each other's rows.
    fileParallelism: false,
  },
});
