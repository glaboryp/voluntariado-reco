import { ACTIVITY_COLS } from './activities';
import { q, tx } from './db';
import type { Activity } from './rules';

export type SignupResult = 'ok' | 'already' | 'full' | 'closed' | 'not_found';

export type SignupPerson = {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  isAdult: boolean;
  createdAt: Date;
  confirmationSent: boolean;
};

const PEOPLE_SQL = `SELECT s.user_id AS "userId", coalesce(p.full_name, '') AS "fullName", coalesce(p.phone, '') AS phone,
    u.email, coalesce(p.is_adult, false) AS "isAdult", s.created_at AS "createdAt", s.confirmation_sent AS "confirmationSent"
  FROM signups s JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id`;

export function signUp(activityId: number, userId: string, now = new Date()): Promise<SignupResult> {
  return tx(async (c) => {
    const { rows: [a] } = await c.query<{ hidden: boolean; signup_closes_at: Date; capacity: number }>(
      'SELECT hidden, signup_closes_at, capacity FROM activities WHERE id = $1 FOR UPDATE',
      [activityId],
    );
    if (!a || a.hidden) return 'not_found';
    if (now >= a.signup_closes_at) return 'closed';
    const { rows: [{ n }] } = await c.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM signups WHERE activity_id = $1',
      [activityId],
    );
    const inserted = await c.query(
      'INSERT INTO signups (activity_id, user_id) SELECT $1, $2 WHERE $3 ON CONFLICT DO NOTHING',
      [activityId, userId, n < a.capacity],
    );
    if (inserted.rowCount) return 'ok';
    const { rowCount } = await c.query('SELECT 1 FROM signups WHERE activity_id = $1 AND user_id = $2', [activityId, userId]);
    return rowCount ? 'already' : 'full';
  });
}

export function listSignups(activityId: number): Promise<SignupPerson[]> {
  return q<SignupPerson>(`${PEOPLE_SQL} WHERE s.activity_id = $1 ORDER BY s.created_at`, [activityId]);
}

export async function removeSignup(activityId: number, userId: string): Promise<SignupPerson | null> {
  const [person] = await q<SignupPerson>(`${PEOPLE_SQL} WHERE s.activity_id = $1 AND s.user_id = $2`, [activityId, userId]);
  if (!person) return null;
  const deleted = await q('DELETE FROM signups WHERE activity_id = $1 AND user_id = $2 RETURNING user_id', [activityId, userId]);
  return deleted.length ? person : null;
}

export function listUserActivities(userId: string): Promise<Activity[]> {
  return q<Activity>(
    `SELECT ${ACTIVITY_COLS} FROM activities a JOIN signups me ON me.activity_id = a.id AND me.user_id = $1
     ORDER BY a.starts_at, a.id`,
    [userId],
  );
}

export async function markConfirmationSent(activityId: number, userId: string): Promise<void> {
  await q('UPDATE signups SET confirmation_sent = true WHERE activity_id = $1 AND user_id = $2', [activityId, userId]);
}
