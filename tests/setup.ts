import { readFile } from 'node:fs/promises';
import { beforeAll, beforeEach } from 'vitest';
import { q } from '../src/lib/db';

export async function resetDb() {
  await q('TRUNCATE signups, profiles, sessions, users, activities, admins RESTART IDENTITY CASCADE');
}

beforeAll(async () => {
  await q(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
});

beforeEach(resetDb);
