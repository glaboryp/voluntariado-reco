import { expect, test } from 'vitest';
import { setHidden } from '../src/lib/activities';
import type { Mail } from '../src/lib/mail';
import { sendReminders } from '../src/lib/reminders';
import { signUp } from '../src/lib/signups';
import { mkActivity, mkUser } from './helpers';

// 17:00 UTC on 12 Dec = 18:00 in Madrid, so "tomorrow" is 13 Dec in Madrid
const now = new Date('2027-12-12T17:00Z');
const at = (iso: string) => ({ startsAt: new Date(iso), signupClosesAt: new Date(iso) });

const recorder = (failFor?: string) => {
  const sent: Mail[] = [];
  return { sent, send: async (m: Mail) => { if (m.to === failFor) throw new Error('smtp down'); sent.push(m); } };
};

test('avisa solo a las apuntadas a voluntariados visibles de mañana (hora de Madrid), una sola vez', async () => {
  const [u1, u2, u3] = [await mkUser(1), await mkUser(2), await mkUser(3)];
  const tomorrow = await mkActivity({ title: 'Mañana', ...at('2027-12-13T09:00Z'), capacity: 5 });
  const afterMidnight = await mkActivity({ title: 'Madrugada del 14', ...at('2027-12-13T23:30Z') });
  const dayAfter = await mkActivity({ title: 'Pasado', ...at('2027-12-14T09:00Z') });
  const hidden = await mkActivity({ title: 'Oculto', ...at('2027-12-13T09:00Z') });
  for (const a of [tomorrow, dayAfter, hidden]) await signUp(a, u1, new Date('2027-12-01'));
  await signUp(tomorrow, u2, new Date('2027-12-01'));
  await signUp(afterMidnight, u3, new Date('2027-12-01'));
  await setHidden(hidden, true);

  const { sent, send } = recorder();
  expect(await sendReminders(now, send)).toEqual({ sent: 2, failed: [] });
  expect(sent.map((m) => `${m.to} ${m.subject}`).sort()).toEqual(['user1@x.es Mañana: Mañana', 'user2@x.es Mañana: Mañana']);

  const again = recorder();
  expect(await sendReminders(now, again.send)).toEqual({ sent: 0, failed: [] });
});

test('si un envío falla, se reintenta en la siguiente ejecución', async () => {
  const a = await mkActivity(at('2027-12-13T09:00Z'));
  await signUp(a, await mkUser(1), new Date('2027-12-01'));
  expect(await sendReminders(now, recorder('user1@x.es').send)).toEqual({ sent: 0, failed: ['user1@x.es'] });
  expect(await sendReminders(now, recorder().send)).toEqual({ sent: 1, failed: [] });
});
