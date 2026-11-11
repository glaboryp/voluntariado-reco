import { describe, expect, test } from 'vitest';
import { getActivity } from '../src/lib/activities';
import { adminRemoveSignup, removeActivity, saveActivity } from '../src/lib/admin-flow';
import type { Mail } from '../src/lib/mail';
import { listSignups, signUp } from '../src/lib/signups';
import { activityInput, mkActivity, mkUser } from './helpers';

const recorder = () => {
  const sent: Mail[] = [];
  return { sent, send: async (m: Mail) => { sent.push(m); } };
};

describe('saveActivity', () => {
  test('con apuntados y lugar nuevo, ask ⇒ prompt sin guardar', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    const r = await saveActivity(a, activityInput({ location: 'Otro' }), 'ask');
    expect(r).toEqual({ kind: 'prompt', count: 1 });
    expect((await getActivity(a))!.location).toBe('Mercadona Goya');
  });

  test('yes ⇒ guarda y envía el aviso de cambio a cada apuntado', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    const { sent, send } = recorder();
    expect(await saveActivity(a, activityInput({ location: 'Otro' }), 'yes', send)).toEqual({ kind: 'saved', failed: [] });
    expect((await getActivity(a))!.location).toBe('Otro');
    expect(sent.map((m) => m.to)).toEqual(['user1@x.es']);
    expect(sent[0].text).toContain('Mercadona Goya → Otro');
  });

  test('no ⇒ guarda sin enviar', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    const { sent, send } = recorder();
    expect(await saveActivity(a, activityInput({ location: 'Otro' }), 'no', send)).toEqual({ kind: 'saved', failed: [] });
    expect(sent).toHaveLength(0);
  });

  test('solo cambia el título ⇒ guarda sin preguntar', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    expect(await saveActivity(a, activityInput({ title: 'Nuevo' }), 'ask')).toEqual({ kind: 'saved', failed: [] });
  });

  test('cupo por debajo de apuntados ⇒ error antes de preguntar', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    await signUp(a, await mkUser(2));
    expect(await saveActivity(a, activityInput({ capacity: 1, location: 'Otro' }), 'ask')).toEqual({ kind: 'error', reason: 'capacity_below_taken' });
    expect(await saveActivity(a, activityInput({ capacity: 1 }), 'yes')).toEqual({ kind: 'error', reason: 'capacity_below_taken' });
    expect(await saveActivity(999, activityInput(), 'ask')).toEqual({ kind: 'error', reason: 'not_found' });
  });

  test('si un envío falla se informa del email', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    await signUp(a, await mkUser(2));
    const r = await saveActivity(a, activityInput({ location: 'Otro' }), 'yes', async (m) => {
      if (m.to === 'user2@x.es') throw new Error('smtp');
    });
    expect(r).toEqual({ kind: 'saved', failed: ['user2@x.es'] });
  });
});

describe('removeActivity y adminRemoveSignup', () => {
  test('eliminar con yes avisa a cada apuntado de la cancelación', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    await signUp(a, await mkUser(2));
    const { sent, send } = recorder();
    expect(await removeActivity(a, 'yes', send)).toEqual({ failed: [] });
    expect(sent.map((m) => m.to).sort()).toEqual(['user1@x.es', 'user2@x.es']);
    expect(sent[0].subject).toMatch(/Cancelado/);
    expect(await getActivity(a)).toBeNull();
  });

  test('eliminar con no no envía nada', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    const { sent, send } = recorder();
    await removeActivity(a, 'no', send);
    expect(sent).toHaveLength(0);
  });

  test('quitar a un apuntado con yes le avisa solo a él', async () => {
    const a = await mkActivity();
    const u1 = await mkUser(1);
    await signUp(a, u1);
    await signUp(a, await mkUser(2));
    const { sent, send } = recorder();
    expect(await adminRemoveSignup(a, u1, 'yes', send)).toEqual({ failed: [] });
    expect(sent.map((m) => m.to)).toEqual(['user1@x.es']);
    expect((await listSignups(a)).map((p) => p.email)).toEqual(['user2@x.es']);
  });
});
