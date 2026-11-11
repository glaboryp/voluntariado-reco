import { expect, test } from 'vitest';
import type { SessionUser } from '../src/lib/auth';
import type { Mail } from '../src/lib/mail';
import { listSignups, signUp } from '../src/lib/signups';
import { completeSignup } from '../src/lib/signup-flow';
import { mkActivity, mkUser } from './helpers';

const asUser = (id: string, n: number): SessionUser => ({ id, email: `user${n}@x.es`, isAdmin: false, hasProfile: true });

test('si el email falla la inscripción queda hecha sin confirmación enviada', async () => {
  const a = await mkActivity();
  const u = await mkUser(1);
  const r = await completeSignup(a, asUser(u, 1), async () => { throw new Error('smtp'); });
  expect(r).toBe('ok');
  expect((await listSignups(a))[0].confirmationSent).toBe(false);
});

test('si el email sale se marca la confirmación y va a la persona', async () => {
  const a = await mkActivity();
  const u = await mkUser(1);
  const sent: Mail[] = [];
  expect(await completeSignup(a, asUser(u, 1), async (m) => { sent.push(m); })).toBe('ok');
  expect(sent.map((m) => m.to)).toEqual(['user1@x.es']);
  expect(sent[0].text).toContain('Persona 1');
  expect((await listSignups(a))[0].confirmationSent).toBe(true);
});

test('voluntariado lleno ⇒ full y no envía nada', async () => {
  const a = await mkActivity({ capacity: 1 });
  await signUp(a, await mkUser(1));
  const u = await mkUser(2);
  let calls = 0;
  expect(await completeSignup(a, asUser(u, 2), async () => { calls++; })).toBe('full');
  expect(calls).toBe(0);
});
