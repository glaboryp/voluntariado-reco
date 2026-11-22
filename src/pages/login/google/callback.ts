import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/admins';
import { createSession, exchangeGoogleCode, landingAfterLogin, safeNext, SESSION_COOKIE } from '../../../lib/auth';
import { upsertUserFromGoogle } from '../../../lib/users';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const state = cookies.get('oauth_state')?.value;
  const verifier = cookies.get('oauth_verifier')?.value;
  const next = safeNext(cookies.get('oauth_next')?.value);
  for (const name of ['oauth_state', 'oauth_verifier', 'oauth_next']) cookies.delete(name, { path: '/' });

  const code = url.searchParams.get('code');
  if (!code || !state || !verifier || url.searchParams.get('state') !== state) {
    return redirect(`/?login=${url.searchParams.has('error') ? 'cancelado' : 'caducado'}`);
  }
  const google = await exchangeGoogleCode(code, verifier);
  if (!google.emailVerified) return new Response('Tu cuenta de Google no tiene el email verificado.', { status: 400 });

  const userId = await upsertUserFromGoogle(google.sub, google.email);
  const { token, expiresAt } = await createSession(userId);
  cookies.set(SESSION_COOKIE, token, {
    path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', expires: expiresAt,
  });
  return redirect(landingAfterLogin(next, await isAdmin(google.email)));
};
