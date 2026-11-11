const TZ = 'Europe/Madrid';

const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' });
const localFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const longFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

function offsetMs(at: number): number {
  const name = offsetFmt.formatToParts(at).find((p) => p.type === 'timeZoneName')!.value;
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000 : 0;
}

export function madridLocalToDate(local: string): Date {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return new Date(NaN);
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // second pass picks the right offset when the first guess lands across a DST switch
  return new Date(asUtc - offsetMs(asUtc - offsetMs(asUtc)));
}

export function dateToMadridLocal(d: Date): string {
  const p = Object.fromEntries(localFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function formatMadrid(d: Date): string {
  return longFmt.format(d);
}

export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

export function formatRange(start: Date, end: Date | null): string {
  if (!end) return formatMadrid(start);
  if (dayFmt.format(start) === dayFmt.format(end)) return `${formatMadrid(start)}–${formatTime(end)}`;
  return `${formatMadrid(start)} – ${formatMadrid(end)}`;
}
