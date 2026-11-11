import { describe, expect, test } from 'vitest';
import {
  deleteActivity, getActivity, listAllActivities, listPublicActivities, setHidden, updateActivity,
} from '../src/lib/activities';
import { addAdmin, isAdmin, listAdmins, removeAdmin } from '../src/lib/admins';
import { getProfile } from '../src/lib/profiles';
import { purgeVolunteerData } from '../src/lib/purge';
import { confirmationSentFor, listSignups, listUserActivities, markConfirmationSent, removeSignup, signUp } from '../src/lib/signups';
import { upsertUserFromGoogle } from '../src/lib/users';
import { q } from '../src/lib/db';
import { activityInput, mkActivity, mkUser } from './helpers';

describe('inscripciones', () => {
  test('cupo atómico: 6 inscripciones simultáneas a 2 plazas ⇒ exactamente 2 ok', async () => {
    const a = await mkActivity();
    const users = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => mkUser(n)));
    const r = await Promise.all(users.map((u) => signUp(a, u)));
    expect(r.filter((x) => x === 'ok')).toHaveLength(2);
    expect(r.filter((x) => x === 'full')).toHaveLength(4);
    expect((await getActivity(a))!.taken).toBe(2);
  });

  test('apuntarse dos veces ⇒ already', async () => {
    const a = await mkActivity();
    const u = await mkUser(1);
    expect(await signUp(a, u)).toBe('ok');
    expect(await signUp(a, u)).toBe('already');
  });

  test('pasado el cierre ⇒ closed', async () => {
    const a = await mkActivity();
    const u = await mkUser(1);
    expect(await signUp(a, u, new Date('2027-12-12T20:00Z'))).toBe('closed');
  });

  test('voluntariado oculto o inexistente ⇒ not_found', async () => {
    const a = await mkActivity();
    await setHidden(a, true);
    const u = await mkUser(1);
    expect(await signUp(a, u)).toBe('not_found');
    expect(await signUp(9999, u)).toBe('not_found');
  });

  test('removeSignup libera la plaza y devuelve a la persona', async () => {
    const a = await mkActivity({ capacity: 1 });
    const [u1, u2] = [await mkUser(1), await mkUser(2)];
    await signUp(a, u1);
    expect(await signUp(a, u2)).toBe('full');
    const removed = await removeSignup(a, u1);
    expect(removed).toMatchObject({ userId: u1, fullName: 'Persona 1', email: 'user1@x.es' });
    expect(await removeSignup(a, u1)).toBeNull();
    expect(await signUp(a, u2)).toBe('ok');
  });

  test('listSignups trae los datos de contacto; markConfirmationSent marca el envío', async () => {
    const a = await mkActivity();
    const u = await mkUser(1);
    await signUp(a, u);
    let [p] = await listSignups(a);
    expect(p).toMatchObject({ fullName: 'Persona 1', phone: '612000001', email: 'user1@x.es', isAdult: true, confirmationSent: false });
    expect(p.createdAt).toBeInstanceOf(Date);
    await markConfirmationSent(a, u);
    [p] = await listSignups(a);
    expect(p.confirmationSent).toBe(true);
  });
});

describe('voluntariados', () => {
  test('no deja bajar el cupo por debajo de apuntados', async () => {
    const a = await mkActivity();
    await signUp(a, await mkUser(1));
    await signUp(a, await mkUser(2));
    expect(await updateActivity(a, activityInput({ capacity: 1 }))).toEqual({ ok: false, reason: 'capacity_below_taken' });
    expect(await updateActivity(9999, activityInput())).toEqual({ ok: false, reason: 'not_found' });
  });

  test('updateActivity guarda y devuelve el estado anterior', async () => {
    const a = await mkActivity();
    const r = await updateActivity(a, activityInput({ location: 'Otro sitio', capacity: 5 }));
    expect(r.ok && r.before.location).toBe('Mercadona Goya');
    expect(await getActivity(a)).toMatchObject({ location: 'Otro sitio', capacity: 5, taken: 0, hidden: false });
  });

  test('borrar voluntariado devuelve a sus apuntados y los borra en cascada', async () => {
    const a = await mkActivity();
    const u = await mkUser(1);
    await signUp(a, u);
    const r = await deleteActivity(a);
    expect(r?.activity.title).toBe('Banco de Alimentos');
    expect(r?.people.map((p) => p.email)).toEqual(['user1@x.es']);
    expect(await getActivity(a)).toBeNull();
    expect(await q('SELECT * FROM signups')).toHaveLength(0);
    expect(await deleteActivity(a)).toBeNull();
  });

  test('listPublicActivities excluye ocultos y empezados; listUserActivities incluye ocultos', async () => {
    const visible = await mkActivity({ title: 'B', startsAt: new Date('2027-12-14T09:00Z') });
    const early = await mkActivity({ title: 'A' });
    const hidden = await mkActivity({ title: 'Oculto' });
    await mkActivity({ title: 'Pasado', startsAt: new Date('2020-01-01T09:00Z'), signupClosesAt: new Date('2020-01-01T09:00Z') });
    const u = await mkUser(1);
    await signUp(hidden, u);
    await signUp(visible, u);
    await setHidden(hidden, true);
    expect((await listPublicActivities()).map((a) => a.title)).toEqual(['A', 'B']);
    expect((await listAllActivities()).map((a) => a.title)).toEqual(['Pasado', 'A', 'Oculto', 'B']);
    expect((await listUserActivities(u)).map((a) => a.id).sort()).toEqual([visible, hidden].sort());
    expect(early).toBeGreaterThan(0);
  });
});

describe('usuarios y perfiles', () => {
  test('upsertUserFromGoogle guarda en minúsculas y es idempotente por sub', async () => {
    const id = await upsertUserFromGoogle('sub-x', 'Ana@X.es');
    expect(await upsertUserFromGoogle('sub-x', 'ana.nueva@x.es')).toBe(id);
    expect(await q('SELECT email FROM users')).toEqual([{ email: 'ana.nueva@x.es' }]);
  });

  test('getProfile devuelve null sin perfil y los datos con email si existe', async () => {
    const u = await mkUser(1, false);
    expect(await getProfile(u)).toBeNull();
    const v = await mkUser(2);
    expect(await getProfile(v)).toEqual({ fullName: 'Persona 2', phone: '612000002', isAdult: true, email: 'user2@x.es' });
  });
});

describe('admins', () => {
  test('isAdmin ignora mayúsculas y espacios; addAdmin no duplica', async () => {
    await addAdmin(' Gloria@Ejemplo.com ');
    await addAdmin('gloria@ejemplo.com');
    expect(await listAdmins()).toEqual(['gloria@ejemplo.com']);
    expect(await isAdmin('GLORIA@ejemplo.com')).toBe(true);
    expect(await isAdmin('otro@ejemplo.com')).toBe(false);
  });

  test('un admin no puede quitarse a sí mismo', async () => {
    await addAdmin('a@x.es');
    await addAdmin('b@x.es');
    expect(await removeAdmin('A@x.es', 'a@x.es')).toBe('self');
    expect(await removeAdmin('b@x.es', 'a@x.es')).toBe('ok');
    expect(await listAdmins()).toEqual(['a@x.es']);
  });
});

describe('purga', () => {
  test('borra inscripciones, perfiles y usuarios no admin; conserva voluntariados, admins y su usuario', async () => {
    const a = await mkActivity();
    const volunteer = await mkUser(1);
    const admin = await mkUser(2);
    await addAdmin('user2@x.es');
    await signUp(a, volunteer);
    await signUp(a, admin);
    expect(await purgeVolunteerData()).toEqual({ signups: 2, profiles: 2 });
    expect(await q('SELECT id FROM users')).toEqual([{ id: admin }]);
    expect(await getProfile(admin)).toBeNull();
    expect(await listAdmins()).toEqual(['user2@x.es']);
    expect((await getActivity(a))!.taken).toBe(0);
  });
});

test('confirmationSentFor dice si salió el email de confirmación', async () => {
  const a = await mkActivity();
  const u = await mkUser(1);
  await signUp(a, u);
  expect(await confirmationSentFor(a, u)).toBe(false);
  await markConfirmationSent(a, u);
  expect(await confirmationSentFor(a, u)).toBe(true);
  expect(await confirmationSentFor(999, u)).toBe(false);
});
