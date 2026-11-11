import type { APIRoute } from 'astro';
import { createPkce, googleAuthUrl, safeNext } from '../../lib/auth';

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const { state, verifier, challenge } = createPkce();
  const opts = { path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax' as const, maxAge: 600 };
  cookies.set('oauth_state', state, opts);
  cookies.set('oauth_verifier', verifier, opts);
  cookies.set('oauth_next', safeNext(url.searchParams.get('next')), opts);
  return redirect(googleAuthUrl(state, challenge));
};
