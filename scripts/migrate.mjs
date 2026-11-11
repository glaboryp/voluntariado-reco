import { readFile } from 'node:fs/promises';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const admin = process.env.INITIAL_ADMIN_EMAIL;
  if (admin) {
    await client.query('INSERT INTO admins (email) VALUES (lower(trim($1))) ON CONFLICT DO NOTHING', [admin]);
  }
  console.log('Schema applied' + (admin ? `, initial admin ensured` : ''));
} finally {
  await client.end();
}
