import { q } from './db';
import type { ProfileInput } from './rules';

export type Profile = ProfileInput & { email: string };

export async function getProfile(userId: string): Promise<Profile | null> {
  const [p] = await q<Profile>(
    `SELECT p.full_name AS "fullName", p.phone, p.is_adult AS "isAdult", u.email
     FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`,
    [userId],
  );
  return p ?? null;
}

export async function upsertProfile(userId: string, input: ProfileInput): Promise<void> {
  await q(
    `INSERT INTO profiles (user_id, full_name, phone, is_adult, consent_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, is_adult = EXCLUDED.is_adult`,
    [userId, input.fullName, input.phone, input.isAdult],
  );
}
