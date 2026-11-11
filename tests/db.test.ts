import { expect, test } from 'vitest';
import { q, tx } from '../src/lib/db';

test('rechaza un cierre de inscripción posterior al inicio', async () => {
  await expect(
    q(`INSERT INTO activities (title, location, starts_at, signup_closes_at, capacity)
       VALUES ('t', 'l', '2026-12-13T09:00Z', '2026-12-13T10:00Z', 5)`),
  ).rejects.toThrow(/check/i);
});

test('tx revierte si la función lanza', async () => {
  await expect(
    tx(async (c) => {
      await c.query(`INSERT INTO admins VALUES ('a@x.es')`);
      throw new Error('x');
    }),
  ).rejects.toThrow('x');
  expect(await q('SELECT * FROM admins')).toHaveLength(0);
});
