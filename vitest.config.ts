import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:54329/reco_test',
      TZ: 'UTC',
      SITE_URL: 'https://voluntariado.test',
    },
  },
});
