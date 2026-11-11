import { describe, expect, test } from 'vitest';
import {
  activityFormValues, activityStatus, changedFields, needsChangePrompt, normalizePhone, parseActivityForm, parseProfileForm,
  type ActivityInput,
} from '../src/lib/rules';

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};

const activityFields = {
  title: ' Banco de Alimentos ', description: 'Recogida', location: ' Mercadona Goya ',
  startsAt: '2026-12-13T10:00', endsAt: '2026-12-13T14:00', signupClosesAt: '', capacity: '10',
};

describe('normalizePhone', () => {
  test('acepta formatos habituales', () => {
    expect(normalizePhone('612 34 56 78')).toBe('612345678');
    expect(normalizePhone('+34 612-345-678')).toBe('+34612345678');
    expect(normalizePhone('(+44) 7700 900123')).toBe('+447700900123');
  });
  test('rechaza números inválidos', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('512345678')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('parseActivityForm', () => {
  test('cierre vacío ⇒ igual al inicio; textos recortados', () => {
    const r = parseActivityForm(form(activityFields));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.signupClosesAt.toISOString()).toBe(r.data.startsAt.toISOString());
    expect(r.data.startsAt.toISOString()).toBe('2026-12-13T09:00:00.000Z');
    expect(r.data.title).toBe('Banco de Alimentos');
    expect(r.data.location).toBe('Mercadona Goya');
    expect(r.data.capacity).toBe(10);
  });
  test('cierre posterior al inicio ⇒ error', () => {
    const r = parseActivityForm(form({ ...activityFields, signupClosesAt: '2026-12-13T11:00' }));
    expect(r.ok === false && r.errors.signupClosesAt).toBeTruthy();
  });
  test('cierre anterior al inicio ⇒ ok', () => {
    const r = parseActivityForm(form({ ...activityFields, signupClosesAt: '2026-12-12T20:00' }));
    expect(r.ok && r.data.signupClosesAt.toISOString()).toBe('2026-12-12T19:00:00.000Z');
  });
  test('fin no posterior al inicio ⇒ error; fin vacío ⇒ null', () => {
    const bad = parseActivityForm(form({ ...activityFields, endsAt: '2026-12-13T10:00' }));
    expect(bad.ok === false && bad.errors.endsAt).toBeTruthy();
    const none = parseActivityForm(form({ ...activityFields, endsAt: '' }));
    expect(none.ok && none.data.endsAt).toBeNull();
  });
  test.each(['0', '2.5', 'x', ''])('cupo %s ⇒ error', (capacity) => {
    const r = parseActivityForm(form({ ...activityFields, capacity }));
    expect(r.ok === false && r.errors.capacity).toBeTruthy();
  });
  test('título, lugar o inicio vacíos ⇒ error en ese campo', () => {
    const r = parseActivityForm(form({ ...activityFields, title: '  ', location: ' ', startsAt: '' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['title', 'location', 'startsAt']));
  });
});

describe('parseProfileForm', () => {
  const ok = { fullName: ' Ana Núñez ', phone: '612 345 678', isAdult: 'si', hasCar: 'no', consent: 'on' };
  test('datos válidos', () => {
    expect(parseProfileForm(form(ok), true)).toEqual({ ok: true, data: { fullName: 'Ana Núñez', phone: '612345678', isAdult: true, hasCar: false, referredBy: null } });
    expect(parseProfileForm(form({ ...ok, isAdult: 'no' }), true)).toMatchObject({ ok: true, data: { isAdult: false } });
    expect(parseProfileForm(form({ ...ok, hasCar: 'si' }), true)).toMatchObject({ ok: true, data: { hasCar: true } });
  });
  test('quién te ha invitado es opcional y se recorta', () => {
    expect(parseProfileForm(form({ ...ok, referredBy: '  Marta López ' }), true)).toMatchObject({ ok: true, data: { referredBy: 'Marta López' } });
    expect(parseProfileForm(form({ ...ok, referredBy: '   ' }), true)).toMatchObject({ ok: true, data: { referredBy: null } });
    const long = parseProfileForm(form({ ...ok, referredBy: 'x'.repeat(121) }), true);
    expect(long.ok === false && long.errors.referredBy).toBeTruthy();
  });
  test('sin consentimiento ⇒ error solo si se exige', () => {
    const { consent, ...noConsent } = ok;
    const r = parseProfileForm(form(noConsent), true);
    expect(r.ok === false && r.errors.consent).toBeTruthy();
    expect(parseProfileForm(form(noConsent), false).ok).toBe(true);
  });
  test('mayor de edad ausente, teléfono inválido o nombre vacío ⇒ error', () => {
    const r = parseProfileForm(form({ fullName: ' ', phone: '123', consent: 'on' }), true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['fullName', 'phone', 'isAdult', 'hasCar']));
  });
});

describe('activityStatus', () => {
  const base = { startsAt: new Date('2026-12-13T09:00Z'), signupClosesAt: new Date('2026-12-12T20:00Z'), capacity: 2, taken: 1 };
  test('estados', () => {
    expect(activityStatus(base, new Date('2026-12-01'))).toBe('open');
    expect(activityStatus({ ...base, taken: 2 }, new Date('2026-12-01'))).toBe('full');
    expect(activityStatus(base, new Date('2026-12-12T20:00Z'))).toBe('closed');
    expect(activityStatus(base, new Date('2026-12-13T09:00Z'))).toBe('finished');
  });
});

describe('needsChangePrompt', () => {
  const before: ActivityInput = {
    title: 'A', description: 'd', location: 'L', capacity: 5,
    startsAt: new Date('2026-12-13T09:00Z'), endsAt: null, signupClosesAt: new Date('2026-12-13T09:00Z'),
  };
  test('sin apuntados nunca pregunta', () => {
    expect(needsChangePrompt(before, { ...before, location: 'M' }, 0)).toBe(false);
  });
  test('título, descripción o cupo no preguntan', () => {
    expect(needsChangePrompt(before, { ...before, title: 'B', description: 'x', capacity: 9 }, 3)).toBe(false);
  });
  test('lugar, inicio o fin sí preguntan', () => {
    expect(needsChangePrompt(before, { ...before, location: 'M' }, 1)).toBe(true);
    expect(needsChangePrompt(before, { ...before, startsAt: new Date('2026-12-14T09:00Z') }, 1)).toBe(true);
    expect(needsChangePrompt(before, { ...before, endsAt: new Date('2026-12-13T12:00Z') }, 1)).toBe(true);
  });
  test('changedFields lista los campos cambiados', () => {
    expect(changedFields(before, { ...before, location: 'M', endsAt: new Date('2026-12-13T12:00Z') })).toEqual(['endsAt', 'location']);
    expect(changedFields(before, { ...before, startsAt: new Date(before.startsAt) })).toEqual([]);
  });
});

describe('activityFormValues', () => {
  const a = {
    id: 1, title: 'T', description: 'd', location: 'L', capacity: 5, hidden: false, taken: 0,
    startsAt: new Date('2026-12-13T09:00Z'), endsAt: null, signupClosesAt: new Date('2026-12-13T09:00Z'),
  };
  test('cierre igual al inicio ⇒ campo vacío, para que siga al inicio al editar', () => {
    expect(activityFormValues(a)).toMatchObject({ startsAt: '2026-12-13T10:00', signupClosesAt: '', endsAt: '', capacity: '5' });
  });
  test('cierre distinto ⇒ se muestra', () => {
    expect(activityFormValues({ ...a, signupClosesAt: new Date('2026-12-12T20:00Z') }).signupClosesAt).toBe('2026-12-12T21:00');
  });
});
