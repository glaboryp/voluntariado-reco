import { tx } from './db';

export function purgeVolunteerData(): Promise<{ signups: number; profiles: number }> {
  return tx(async (c) => {
    const signups = (await c.query('DELETE FROM signups')).rowCount ?? 0;
    const profiles = (await c.query('DELETE FROM profiles')).rowCount ?? 0;
    await c.query('DELETE FROM users WHERE email NOT IN (SELECT email FROM admins)');
    return { signups, profiles };
  });
}
