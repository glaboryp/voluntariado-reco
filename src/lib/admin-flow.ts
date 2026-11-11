import { deleteActivity, getActivity, updateActivity } from './activities';
import { cancellationEmail, changeEmail, removedEmail } from './emails';
import { sendMany, smtpSend, type Send } from './mail';
import { changedFields, needsChangePrompt, type ActivityInput } from './rules';
import { listSignups, removeSignup } from './signups';

export type SaveResult =
  | { kind: 'saved'; failed: string[] }
  | { kind: 'prompt'; count: number }
  | { kind: 'error'; reason: 'not_found' | 'capacity_below_taken' };

export async function saveActivity(
  id: number,
  input: ActivityInput,
  notify: 'ask' | 'yes' | 'no',
  send: Send = smtpSend,
): Promise<SaveResult> {
  const current = await getActivity(id);
  if (!current) return { kind: 'error', reason: 'not_found' };
  if (input.capacity < current.taken) return { kind: 'error', reason: 'capacity_below_taken' };
  if (notify === 'ask' && needsChangePrompt(current, input, current.taken)) return { kind: 'prompt', count: current.taken };

  const r = await updateActivity(id, input);
  if (!r.ok) return { kind: 'error', reason: r.reason };
  if (notify !== 'yes' || changedFields(r.before, input).length === 0) return { kind: 'saved', failed: [] };

  const after = { ...r.before, ...input };
  const people = await listSignups(id);
  const { failed } = await sendMany(people.map((p) => changeEmail(r.before, after, p)), send);
  return { kind: 'saved', failed };
}

export async function removeActivity(id: number, notify: 'yes' | 'no', send: Send = smtpSend): Promise<{ failed: string[] }> {
  const r = await deleteActivity(id);
  if (!r || notify === 'no') return { failed: [] };
  return sendMany(r.people.map((p) => cancellationEmail(r.activity, p)), send);
}

export async function adminRemoveSignup(
  activityId: number,
  userId: string,
  notify: 'yes' | 'no',
  send: Send = smtpSend,
): Promise<{ failed: string[] }> {
  const person = await removeSignup(activityId, userId);
  const activity = person && notify === 'yes' ? await getActivity(activityId) : null;
  if (!person || !activity) return { failed: [] };
  return sendMany([removedEmail(activity, person)], send);
}
