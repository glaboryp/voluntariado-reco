// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// local dev reads .env into process.env; on Vercel the file doesn't exist
try { process.loadEnvFile(); } catch {}

export default defineConfig({
  output: 'server',
  adapter: vercel(),
});
