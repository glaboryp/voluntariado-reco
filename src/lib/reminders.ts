import { getActivity } from './activities';
import { q } from './db';
import { reminderEmail } from './emails';
import { smtpSend, type Send } from './mail';

type Due = { activityId: number; userId: string; email: string; fullName: string };

export async function sendReminders(now = new Date(), send: Send = smtpSend): Promise<{ sent: number; failed: string[] }> {
  const due = await q<Due>(
    `SELECT s.activity_id AS "activityId", s.user_id AS "userId", u.email, coalesce(p.full_name, '') AS "fullName"
     FROM signups s JOIN activities a ON a.id = s.activity_id JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles p ON p.user_id = s.user_id
     WHERE NOT s.reminder_sent AND NOT a.hidden
       AND (a.starts_at AT TIME ZONE 'Europe/Madrid')::date = ($1::timestamptz AT TIME ZONE 'Europe/Madrid')::date + 1`,
    [now],
  );
  const activities = new Map(
    await Promise.all([...new Set(due.map((d) => d.activityId))].map(async (id) => [id, (await getActivity(id))!] as const)),
  );
  const results = await Promise.allSettled(
    due.map(async (d) => {
      await send(reminderEmail(activities.get(d.activityId)!, d));
      await q('UPDATE signups SET reminder_sent = true WHERE activity_id = $1 AND user_id = $2', [d.activityId, d.userId]);
    }),
  );
  const failed = due.filter((_, i) => results[i].status === 'rejected').map((d) => d.email);
  results.forEach((r) => r.status === 'rejected' && console.error('Reminder failed:', r.reason));
  return { sent: due.length - failed.length, failed };
}
