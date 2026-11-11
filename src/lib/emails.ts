import type { Mail } from './mail';
import type { Activity } from './rules';
import { formatRange } from './time';

type Person = { fullName: string; email: string };

// Provisional copy: edit freely
const COPY = {
  confirmation: {
    subject: (t: string) => `¡Estás dentro! ${t}`,
    title: '¡Te esperamos!',
    intro: (name: string) => `Hola ${name}, gracias por sumarte a este voluntariado de Navidad. Tu plaza está confirmada.`,
    outro: 'Si al final no puedes venir, avísanos liberando tu plaza para que otra persona pueda ocuparla.',
    button: 'Ver mis voluntariados',
  },
  change: {
    subject: (t: string) => `Cambios en ${t}`,
    title: 'Ha cambiado algo de tu voluntariado',
    intro: (name: string) => `Hola ${name}, hemos tenido que cambiar algunos detalles del voluntariado al que estás apuntado/a.`,
    outro: 'Si con el cambio ya no puedes venir, libera tu plaza desde la web.',
    button: 'Ver mis voluntariados',
  },
  cancellation: {
    subject: (t: string) => `Cancelado: ${t}`,
    title: 'Este voluntariado se ha cancelado',
    intro: (name: string) => `Hola ${name}, sentimos contarte que este voluntariado se ha cancelado. Gracias de corazón por querer ayudar.`,
    outro: 'Puedes echar un vistazo a los demás voluntariados de la campaña.',
    button: 'Ver voluntariados',
  },
  removed: {
    subject: (t: string) => `Ya no estás apuntado/a a ${t}`,
    title: 'Te hemos dado de baja de este voluntariado',
    intro: (name: string) => `Hola ${name}, la organización te ha dado de baja de este voluntariado. Si crees que es un error, escríbenos.`,
    outro: '¡Seguro que hay otro voluntariado de Navidad que encaja contigo!',
    button: 'Ver voluntariados',
  },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Row = { label: string; value: string };

const detailRows = (a: Activity): Row[] => [
  { label: 'Fecha y hora', value: formatRange(a.startsAt, a.endsAt) },
  { label: 'Lugar', value: a.location },
];

function render(
  to: string,
  copy: (typeof COPY)[keyof typeof COPY],
  a: Activity,
  name: string,
  rows: Row[],
  link: string,
): Mail {
  const site = process.env.SITE_URL ?? '';
  const url = `${site}${link}`;
  const htmlRows = rows
    .map((r) => `<tr><td style="padding:4px 12px 4px 0;color:#4a5d5f;white-space:nowrap;vertical-align:top">${esc(r.label)}</td>
      <td style="padding:4px 0;color:#12292b;font-weight:600">${esc(r.value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f7f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td><img src="${site}/email-logo.png" alt="Recoletos" width="180" style="display:block;margin-bottom:20px"></td></tr>
<tr><td style="color:#0b7a85;font-size:22px;font-weight:700;padding-bottom:12px">${esc(copy.title)}</td></tr>
<tr><td style="color:#12292b;font-size:15px;line-height:1.5;padding-bottom:16px">${esc(copy.intro(name))}</td></tr>
<tr><td style="background:#eaf5f2;padding:14px 16px">
  <div style="font-size:17px;font-weight:700;color:#12292b;padding-bottom:6px">${esc(a.title)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${htmlRows}</table>
</td></tr>
<tr><td style="color:#12292b;font-size:15px;line-height:1.5;padding:16px 0">${esc(copy.outro)}</td></tr>
<tr><td><a href="${esc(url)}" style="display:inline-block;background:#0b7a85;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">${esc(copy.button)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    copy.title, '', copy.intro(name), '', a.title, ...rows.map((r) => `${r.label}: ${r.value}`), '', copy.outro, '',
    `${copy.button}: ${url}`,
  ].join('\n');
  return { to, subject: copy.subject(a.title), html, text };
}

export const confirmationEmail = (a: Activity, p: Person): Mail =>
  render(p.email, COPY.confirmation, a, p.fullName, detailRows(a), '/mis-voluntariados');

export const cancellationEmail = (a: Activity, p: Person): Mail =>
  render(p.email, COPY.cancellation, a, p.fullName, detailRows(a), '/');

export const removedEmail = (a: Activity, p: Person): Mail =>
  render(p.email, COPY.removed, a, p.fullName, detailRows(a), '/');

export function changeEmail(before: Activity, after: Activity, p: Person): Mail {
  const rows = detailRows(after).map((r, i) => {
    const old = detailRows(before)[i].value;
    return old === r.value ? r : { label: r.label, value: `${old} → ${r.value}` };
  });
  return render(p.email, COPY.change, after, p.fullName, rows, '/mis-voluntariados');
}
