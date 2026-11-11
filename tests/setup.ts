import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { beforeAll, beforeEach } from 'vitest';
import { q } from '../src/lib/db';

export async function resetDb() {
  await q('TRUNCATE signups, profiles, sessions, users, activities, admins RESTART IDENTITY CASCADE');
}

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL!.replace(/\/reco_test$/, '/postgres') });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'reco_test'");
  if (!exists.rowCount) await admin.query('CREATE DATABASE reco_test');
  await admin.end();
  await q(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
});

beforeEach(resetDb);
