import { defineMiddleware } from 'astro:middleware';
import { guard, SESSION_COOKIE, validateSession } from './lib/auth';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  ctx.locals.user = token ? await validateSession(token) : null;
  if (token && !ctx.locals.user) ctx.cookies.delete(SESSION_COOKIE, { path: '/' });

  const verdict = guard(ctx.url.pathname, ctx.locals.user);
  if (verdict === 'login') {
    return ctx.redirect(`/login/google?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`);
  }
  if (verdict === 'forbidden') {
    return new Response('No tienes acceso al panel de administración.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return next();
});
