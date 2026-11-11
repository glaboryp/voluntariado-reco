import { createActivity } from '../src/lib/activities';
import { upsertProfile } from '../src/lib/profiles';
import { upsertUserFromGoogle } from '../src/lib/users';
import type { ActivityInput } from '../src/lib/rules';

export async function mkUser(n: number, withProfile = true): Promise<string> {
  const id = await upsertUserFromGoogle(`sub-${n}`, `user${n}@x.es`);
  if (withProfile) await upsertProfile(id, { fullName: `Persona ${n}`, phone: `61200000${n}`, isAdult: true, referredBy: n === 2 ? 'Marta' : null });
  return id;
}

export function activityInput(over: Partial<ActivityInput> = {}): ActivityInput {
  return {
    title: 'Banco de Alimentos', description: 'Recogida', location: 'Mercadona Goya',
    startsAt: new Date('2027-12-13T09:00Z'), endsAt: null, signupClosesAt: new Date('2027-12-12T20:00Z'),
    capacity: 2, ...over,
  };
}

export const mkActivity = (over: Partial<ActivityInput> = {}) => createActivity(activityInput(over));
