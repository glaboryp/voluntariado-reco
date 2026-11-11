import type { APIRoute } from 'astro';
import { invalidateSession, SESSION_COOKIE } from '../lib/auth';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await invalidateSession(token);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/');
};
