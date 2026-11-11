import { describe, expect, test } from 'vitest';
import { createSession, guard, invalidateSession, safeNext, validateSession, type SessionUser } from '../src/lib/auth';
import { addAdmin } from '../src/lib/admins';
import { q } from '../src/lib/db';
import { purgeVolunteerData } from '../src/lib/purge';
import { mkUser } from './helpers';

describe('sesiones', () => {
  test('sesión válida devuelve usuario con flags', async () => {
    const u = await mkUser(1);
    await addAdmin('user1@x.es');
    const { token, expiresAt } = await createSession(u);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect(await validateSession(token)).toEqual({ id: u, email: 'user1@x.es', isAdmin: true, hasProfile: true });
    const v = await mkUser(2, false);
    const s2 = await createSession(v);
    expect(await validateSession(s2.token)).toEqual({ id: v, email: 'user2@x.es', isAdmin: false, hasProfile: false });
  });

  test('en base de datos no se guarda el token en claro', async () => {
    const { token } = await createSession(await mkUser(1));
    const [row] = await q<{ id: string }>('SELECT id FROM sessions');
    expect(row.id).not.toBe(token);
    expect(row.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('sesión caducada ⇒ null y se borra', async () => {
    const { token } = await createSession(await mkUser(1));
    await q(`UPDATE sessions SET expires_at = now() - interval '1 minute'`);
    expect(await validateSession(token)).toBeNull();
    expect(await q('SELECT * FROM sessions')).toHaveLength(0);
  });

  test('token desconocido o invalidado ⇒ null', async () => {
    expect(await validateSession('nope')).toBeNull();
    const { token } = await createSession(await mkUser(1));
    await invalidateSession(token);
    expect(await validateSession(token)).toBeNull();
  });

  test('tras la purga la sesión de un no-admin ⇒ null; la de un admin sigue sin perfil', async () => {
    const volunteer = await createSession(await mkUser(1));
    const adminId = await mkUser(2);
    await addAdmin('user2@x.es');
    const admin = await createSession(adminId);
    await purgeVolunteerData();
    expect(await validateSession(volunteer.token)).toBeNull();
    expect(await validateSession(admin.token)).toMatchObject({ isAdmin: true, hasProfile: false });
  });
});

describe('guard', () => {
  const u: SessionUser = { id: 'x', email: 'a@x.es', isAdmin: false, hasProfile: true };
  test('protege /admin solo para admins', () => {
    expect(guard('/admin', null)).toBe('login');
    expect(guard('/admin/voluntariados/3', { ...u, isAdmin: false })).toBe('forbidden');
    expect(guard('/admin', { ...u, isAdmin: true })).toBe('allow');
    expect(guard('/admin/', { ...u, isAdmin: true })).toBe('allow');
  });
  test('rutas de voluntario piden sesión', () => {
    expect(guard('/mis-voluntariados', null)).toBe('login');
    expect(guard('/mis-datos', null)).toBe('login');
    expect(guard('/apuntarme/1', null)).toBe('login');
    expect(guard('/apuntarme/1', u)).toBe('allow');
  });
  test('rutas públicas', () => {
    expect(guard('/', null)).toBe('allow');
    expect(guard('/administracion', null)).toBe('allow');
    expect(guard('/login/google', null)).toBe('allow');
  });
});

test('safeNext solo acepta rutas internas', () => {
  expect(safeNext('/apuntarme/3')).toBe('/apuntarme/3');
  expect(safeNext('//evil.com')).toBe('/');
  expect(safeNext('https://evil.com')).toBe('/');
  expect(safeNext('/\\evil.com')).toBe('/');
  expect(safeNext(null)).toBe('/');
  expect(safeNext('/\t/evil.com')).toBe('/');
  expect(safeNext('/%09/evil.com')).toBe('/%09/evil.com');
  expect(safeNext('/mis-voluntariados?ok=3')).toBe('/mis-voluntariados?ok=3');
});
