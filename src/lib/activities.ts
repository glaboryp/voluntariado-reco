import { q, tx } from './db';
import type { Activity, ActivityInput } from './rules';

export const ACTIVITY_COLS = `a.id, a.title, a.description, a.location,
  a.starts_at AS "startsAt", a.ends_at AS "endsAt", a.signup_closes_at AS "signupClosesAt",
  a.capacity, a.hidden, (SELECT count(*) FROM signups s WHERE s.activity_id = a.id)::int AS taken`;

const inputParams = (i: ActivityInput) =>
  [i.title, i.description, i.location, i.startsAt, i.endsAt, i.signupClosesAt, i.capacity];

export function listPublicActivities(now = new Date()): Promise<Activity[]> {
  return q<Activity>(
    `SELECT ${ACTIVITY_COLS} FROM activities a WHERE NOT a.hidden AND a.starts_at > $1 ORDER BY a.starts_at, a.id`,
    [now],
  );
}

export function listAllActivities(): Promise<Activity[]> {
  return q<Activity>(`SELECT ${ACTIVITY_COLS} FROM activities a ORDER BY a.starts_at, a.id`);
}

export async function getActivity(id: number): Promise<Activity | null> {
  const [a] = await q<Activity>(`SELECT ${ACTIVITY_COLS} FROM activities a WHERE a.id = $1`, [id]);
  return a ?? null;
}

export async function createActivity(input: ActivityInput): Promise<number> {
  const [{ id }] = await q<{ id: number }>(
    `INSERT INTO activities (title, description, location, starts_at, ends_at, signup_closes_at, capacity)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    inputParams(input),
  );
  return id;
}

export function updateActivity(
  id: number,
  input: ActivityInput,
): Promise<{ ok: true; before: Activity } | { ok: false; reason: 'not_found' | 'capacity_below_taken' }> {
  return tx(async (c) => {
    const locked = await c.query('SELECT id FROM activities WHERE id = $1 FOR UPDATE', [id]);
    if (!locked.rowCount) return { ok: false, reason: 'not_found' } as const;
    const { rows: [before] } = await c.query<Activity>(`SELECT ${ACTIVITY_COLS} FROM activities a WHERE a.id = $1`, [id]);
    if (input.capacity < before.taken) return { ok: false, reason: 'capacity_below_taken' } as const;
    await c.query(
      `UPDATE activities SET title = $1, description = $2, location = $3, starts_at = $4, ends_at = $5,
         signup_closes_at = $6, capacity = $7 WHERE id = $8`,
      [...inputParams(input), id],
    );
    return { ok: true, before } as const;
  });
}

export async function setHidden(id: number, hidden: boolean): Promise<void> {
  await q('UPDATE activities SET hidden = $2 WHERE id = $1', [id, hidden]);
}

export async function deleteActivity(id: number) {
  const { listSignups } = await import('./signups');
  const activity = await getActivity(id);
  if (!activity) return null;
  const people = await listSignups(id);
  const deleted = await q('DELETE FROM activities WHERE id = $1 RETURNING id', [id]);
  return deleted.length ? { activity, people } : null;
}
