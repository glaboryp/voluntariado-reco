import { dateToMadridLocal, madridLocalToDate } from './time';

export type Activity = {
  id: number;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date | null;
  signupClosesAt: Date;
  capacity: number;
  hidden: boolean;
  taken: number;
};

export type ActivityInput = Omit<Activity, 'id' | 'hidden' | 'taken'>;
export type ProfileInput = { fullName: string; phone: string; isAdult: boolean; referredBy: string | null };
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };
export type ActivityStatus = 'open' | 'full' | 'closed' | 'finished';

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const valid = (d: Date) => !Number.isNaN(d.getTime());

export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-.()]/g, '');
  return /^\+\d{8,15}$/.test(s) || /^[6789]\d{8}$/.test(s) ? s : null;
}

export function parseActivityForm(fd: FormData): Parsed<ActivityInput> {
  const errors: Record<string, string> = {};
  const title = text(fd, 'title');
  const description = text(fd, 'description');
  const location = text(fd, 'location');
  if (!title) errors.title = 'Pon un título.';
  if (!location) errors.location = 'Indica el lugar.';

  const startsAt = madridLocalToDate(text(fd, 'startsAt'));
  if (!valid(startsAt)) errors.startsAt = 'Indica la fecha y hora de inicio.';

  const endsRaw = text(fd, 'endsAt');
  const endsAt = endsRaw ? madridLocalToDate(endsRaw) : null;
  if (endsAt && (!valid(endsAt) || (valid(startsAt) && endsAt <= startsAt))) {
    errors.endsAt = 'La hora de fin tiene que ser posterior al inicio.';
  }

  const closesRaw = text(fd, 'signupClosesAt');
  const signupClosesAt = closesRaw ? madridLocalToDate(closesRaw) : startsAt;
  if (closesRaw && (!valid(signupClosesAt) || (valid(startsAt) && signupClosesAt > startsAt))) {
    errors.signupClosesAt = 'El cierre de inscripción no puede ser posterior al inicio.';
  }

  const capRaw = text(fd, 'capacity');
  const capacity = Number(capRaw);
  if (!/^\d+$/.test(capRaw) || capacity < 1) errors.capacity = 'El cupo tiene que ser un número entero mayor que 0.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { title, description, location, startsAt, endsAt, signupClosesAt, capacity } };
}

export function parseProfileForm(fd: FormData, requireConsent: boolean): Parsed<ProfileInput> {
  const errors: Record<string, string> = {};
  const fullName = text(fd, 'fullName');
  if (!fullName) errors.fullName = 'Escribe tu nombre y apellidos.';
  const phone = normalizePhone(text(fd, 'phone'));
  if (!phone) errors.phone = 'Escribe un teléfono válido, por ejemplo 612 345 678.';
  const adult = text(fd, 'isAdult');
  if (adult !== 'si' && adult !== 'no') errors.isAdult = 'Indica si eres mayor de edad.';
  const referredBy = text(fd, 'referredBy') || null;
  if (referredBy && referredBy.length > 120) errors.referredBy = 'Escríbelo en menos de 120 caracteres.';
  if (requireConsent && !fd.get('consent')) errors.consent = 'Necesitamos tu consentimiento para guardar tus datos.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { fullName, phone: phone!, isAdult: adult === 'si', referredBy } };
}

export function activityStatus(
  a: Pick<Activity, 'startsAt' | 'signupClosesAt' | 'capacity' | 'taken'>,
  now: Date,
): ActivityStatus {
  if (now >= a.startsAt) return 'finished';
  if (now >= a.signupClosesAt) return 'closed';
  if (a.taken >= a.capacity) return 'full';
  return 'open';
}

type WatchedField = 'startsAt' | 'endsAt' | 'location';

export function changedFields(before: ActivityInput, after: ActivityInput): WatchedField[] {
  const t = (d: Date | null) => d?.getTime() ?? null;
  const out: WatchedField[] = [];
  if (t(before.startsAt) !== t(after.startsAt)) out.push('startsAt');
  if (t(before.endsAt) !== t(after.endsAt)) out.push('endsAt');
  if (before.location !== after.location) out.push('location');
  return out;
}

export function needsChangePrompt(before: ActivityInput, after: ActivityInput, signupCount: number): boolean {
  return signupCount > 0 && changedFields(before, after).length > 0;
}

export function activityFormValues(a: Activity): Record<string, string> {
  const closesAtStart = a.signupClosesAt.getTime() === a.startsAt.getTime();
  return {
    title: a.title, description: a.description, location: a.location, capacity: String(a.capacity),
    startsAt: dateToMadridLocal(a.startsAt),
    endsAt: a.endsAt ? dateToMadridLocal(a.endsAt) : '',
    // left empty so a postponed start moves the close with it
    signupClosesAt: closesAtStart ? '' : dateToMadridLocal(a.signupClosesAt),
  };
}
