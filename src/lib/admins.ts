import { q } from './db';

const norm = (email: string) => email.trim().toLowerCase();

export async function isAdmin(email: string): Promise<boolean> {
  return (await q('SELECT 1 FROM admins WHERE email = $1', [norm(email)])).length > 0;
}

export async function listAdmins(): Promise<string[]> {
  return (await q<{ email: string }>('SELECT email FROM admins ORDER BY email')).map((r) => r.email);
}

export async function addAdmin(email: string): Promise<void> {
  await q('INSERT INTO admins (email) VALUES ($1) ON CONFLICT DO NOTHING', [norm(email)]);
}

export async function removeAdmin(email: string, actingEmail: string): Promise<'ok' | 'self'> {
  if (norm(email) === norm(actingEmail)) return 'self';
  await q('DELETE FROM admins WHERE email = $1', [norm(email)]);
  return 'ok';
}
