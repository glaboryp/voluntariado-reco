import ExcelJS from 'exceljs';
import { expect, test } from 'vitest';
import { buildWorkbook, sheetNames } from '../src/lib/export';
import type { Activity } from '../src/lib/rules';

test('sheetNames: duplicados, longitud, caracteres prohibidos y vacíos', () => {
  expect(sheetNames(['Banco de Alimentos', 'Banco de Alimentos'])).toEqual(['Banco de Alimentos', 'Banco de Alimentos (2)']);
  const long = sheetNames(['a'.repeat(40), 'a'.repeat(40)]);
  expect(long.every((n) => n.length <= 31)).toBe(true);
  expect(new Set(long).size).toBe(2);
  expect(sheetNames(['¿Qué? [turno] 1/2'])[0]).toBe('¿Qué turno 12');
  expect(sheetNames(['***'])[0]).toBe('Voluntariado');
  expect(new Set(sheetNames(['banco', 'BANCO'])).size).toBe(2);
  expect(sheetNames(["'Sonrisas' de Navidad", "Recogida 'Banco'"])).toEqual(["Sonrisas' de Navidad", "Recogida 'Banco"]);
  expect(sheetNames(['History'])[0]).not.toMatch(/^history$/i);
  expect(sheetNames(["a".repeat(30) + "'b"])[0].endsWith("'")).toBe(false);
});

test('buildWorkbook: una hoja por voluntariado con cabeceras y datos legibles', async () => {
  const a = { id: 1, title: 'Banco', startsAt: new Date('2026-12-13T09:00Z') } as Activity;
  const person = {
    userId: 'u', fullName: 'Ana Núñez', phone: '612345678', email: 'ana@x.es', isAdult: true, hasCar: null, referredBy: 'Marta López',
    createdAt: new Date('2026-11-20T17:05:00Z'), confirmationSent: true,
  };
  const buf = await buildWorkbook([{ activity: a, people: [person] }, { activity: { ...a, id: 2 }, people: [] }]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  expect(wb.worksheets.map((w) => w.name)).toEqual(['Banco', 'Banco (2)']);
  const ws = wb.worksheets[0];
  expect(ws.getRow(1).values).toEqual([, 'Nombre y apellidos', 'Teléfono', 'Email', 'Mayor de edad', 'Puede llevar coche', 'Quién la ha invitado', 'Fecha de inscripción']);
  expect(ws.getRow(2).values).toEqual([, 'Ana Núñez', '612345678', 'ana@x.es', 'Sí', '', 'Marta López', '20/11/2026, 18:05']);
});

test('buildWorkbook acepta títulos con apóstrofos', async () => {
  const a = { id: 1, title: "'Sonrisas' de Navidad", startsAt: new Date() } as Activity;
  await expect(buildWorkbook([{ activity: a, people: [] }])).resolves.toBeInstanceOf(Buffer);
});
