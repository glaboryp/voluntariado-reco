import { describe, expect, test } from 'vitest';
import { cancellationEmail, changeEmail, confirmationEmail, removedEmail } from '../src/lib/emails';
import { sendMany, type Mail } from '../src/lib/mail';
import type { Activity } from '../src/lib/rules';
import { formatRange } from '../src/lib/time';

const activity: Activity = {
  id: 7, title: 'Banco de Alimentos', description: 'Recogida', location: 'Mercadona Goya',
  startsAt: new Date('2026-12-13T09:00Z'), endsAt: new Date('2026-12-13T13:00Z'),
  signupClosesAt: new Date('2026-12-13T09:00Z'), capacity: 10, hidden: false, taken: 3,
};
const person = { fullName: 'Ana Núñez', email: 'ana@x.es' };

describe('plantillas', () => {
  test.each([
    ['confirmación', confirmationEmail(activity, person)],
    ['cancelación', cancellationEmail(activity, person)],
    ['baja', removedEmail(activity, person)],
    ['cambio', changeEmail(activity, { ...activity, location: 'Carrefour Serrano' }, person)],
  ])('%s lleva título, fecha y lugar en html y texto', (_, m) => {
    expect(m.to).toBe('ana@x.es');
    for (const body of [m.html, m.text]) {
      expect(body).toContain('Banco de Alimentos');
      expect(body).toContain(formatRange(activity.startsAt, activity.endsAt));
    }
  });

  test('confirmación enlaza a mis voluntariados; baja enlaza a la portada', () => {
    expect(confirmationEmail(activity, person).html).toContain('https://voluntariado.test/mis-voluntariados');
    expect(removedEmail(activity, person).text).toContain('https://voluntariado.test/');
  });

  test('cambio de lugar muestra antes y ahora', () => {
    const m = changeEmail(activity, { ...activity, location: 'Carrefour Serrano' }, person);
    expect(m.text).toContain('Mercadona Goya');
    expect(m.text).toContain('Carrefour Serrano');
  });

  test('cambio solo de hora no presenta el lugar como cambio', () => {
    const after = { ...activity, startsAt: new Date('2026-12-13T10:00Z'), endsAt: new Date('2026-12-13T14:00Z') };
    const m = changeEmail(activity, after, person);
    expect(m.text).toContain(formatRange(after.startsAt, after.endsAt));
    expect(m.text).not.toMatch(/Lugar:.*→/);
    expect(m.text).toMatch(/Fecha y hora:.*→/);
  });

  test('escapa el texto del usuario en el html', () => {
    const m = confirmationEmail({ ...activity, title: '<b>x</b>' }, { ...person, fullName: 'A & B' });
    expect(m.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(m.html).not.toContain('<b>x</b>');
    expect(m.html).toContain('A &amp; B');
  });
});

test('sendMany devuelve los emails que fallaron sin lanzar', async () => {
  const mails: Mail[] = ['a@x.es', 'b@x.es'].map((to) => ({ to, subject: 's', html: 'h', text: 't' }));
  const sent: string[] = [];
  const r = await sendMany(mails, async (m) => {
    if (m.to === 'b@x.es') throw new Error('smtp down');
    sent.push(m.to);
  });
  expect(r).toEqual({ failed: ['b@x.es'] });
  expect(sent).toEqual(['a@x.es']);
});
