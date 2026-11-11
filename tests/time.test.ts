import { expect, test } from 'vitest';
import { dateToMadridLocal, formatMadrid, formatRange, madridLocalToDate } from '../src/lib/time';

test('madridLocalToDate interpreta la hora tecleada en Madrid (invierno y verano)', () => {
  expect(madridLocalToDate('2026-12-13T10:00').toISOString()).toBe('2026-12-13T09:00:00.000Z');
  expect(madridLocalToDate('2026-07-01T10:00').toISOString()).toBe('2026-07-01T08:00:00.000Z');
});

test('madridLocalToDate en el día del cambio de hora', () => {
  expect(madridLocalToDate('2026-10-25T12:00').toISOString()).toBe('2026-10-25T11:00:00.000Z');
  expect(madridLocalToDate('2026-03-29T12:00').toISOString()).toBe('2026-03-29T10:00:00.000Z');
});

test('dateToMadridLocal devuelve el valor para un input datetime-local', () => {
  expect(dateToMadridLocal(new Date('2026-12-13T09:00:00Z'))).toBe('2026-12-13T10:00');
  expect(dateToMadridLocal(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02T00:30');
});

test('formatMadrid muestra la hora de Madrid con el servidor en UTC', () => {
  const s = formatMadrid(new Date('2026-12-13T09:00:00Z'));
  expect(s).toContain('10:00');
  expect(s).toMatch(/domingo.*13.*diciembre/);
});

test('formatRange añade la hora de fin si existe', () => {
  const start = new Date('2026-12-13T09:00:00Z');
  expect(formatRange(start, new Date('2026-12-13T13:00:00Z'))).toMatch(/10:00\s*[–-]\s*14:00/);
  expect(formatRange(start, null)).toBe(formatMadrid(start));
});
