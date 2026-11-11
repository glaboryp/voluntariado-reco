import { getActivity } from './activities';
import type { SessionUser } from './auth';
import { confirmationEmail } from './emails';
import { smtpSend, type Send } from './mail';
import { getProfile } from './profiles';
import { markConfirmationSent, signUp, type SignupResult } from './signups';

// Provisional copy: edit freely
export const SIGNUP_MESSAGES: Record<Exclude<SignupResult, 'ok'>, string> = {
  already: 'Ya estabas apuntado/a a este voluntariado.',
  full: 'Vaya, se acaban de cubrir todas las plazas.',
  closed: 'La inscripción para este voluntariado ya está cerrada.',
  not_found: 'Este voluntariado ya no está disponible.',
};

export const CONSENT_TEXT =
  'Acepto que Recoletos guarde mi nombre, teléfono y email para organizar los voluntariados de esta campaña de Navidad. Los datos se borrarán al terminar la campaña.';

export async function completeSignup(activityId: number, user: SessionUser, send: Send = smtpSend): Promise<SignupResult> {
  const result = await signUp(activityId, user.id);
  if (result !== 'ok') return result;
  const [activity, profile] = await Promise.all([getActivity(activityId), getProfile(user.id)]);
  if (!activity || !profile) return result;
  try {
    await send(confirmationEmail(activity, profile));
    await markConfirmationSent(activityId, user.id);
  } catch (e) {
    console.error('Confirmation email failed:', e);
  }
  return result;
}
