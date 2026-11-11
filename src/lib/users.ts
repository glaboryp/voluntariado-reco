import { q } from './db';

export async function upsertUserFromGoogle(sub: string, email: string): Promise<string> {
  const [{ id }] = await q<{ id: string }>(
    `INSERT INTO users (google_sub, email) VALUES ($1, lower(trim($2)))
     ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
    [sub, email],
  );
  return id;
}
