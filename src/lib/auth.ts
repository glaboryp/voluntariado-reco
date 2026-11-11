import { createHash, randomBytes } from 'node:crypto';
import { q } from './db';

export type SessionUser = { id: string; email: string; isAdmin: boolean; hasProfile: boolean };

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash('sha256').update(s).digest();
const hashToken = (token: string) => sha256(token).toString('hex');

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await q('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [hashToken(token), userId, expiresAt]);
  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<SessionUser | null> {
  const id = hashToken(token);
  const [row] = await q<SessionUser & { expiresAt: Date }>(
    `SELECT u.id, u.email, s.expires_at AS "expiresAt",
       EXISTS (SELECT 1 FROM admins a WHERE a.email = u.email) AS "isAdmin",
       EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id) AS "hasProfile"
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [id],
  );
  if (!row) return null;
  if (row.expiresAt <= new Date()) {
    await q('DELETE FROM sessions WHERE id = $1', [id]);
    return null;
  }
  const { expiresAt, ...user } = row;
  return user;
}

export async function invalidateSession(token: string): Promise<void> {
  await q('DELETE FROM sessions WHERE id = $1', [hashToken(token)]);
}

const VOLUNTEER_PATHS = ['/mis-voluntariados', '/mis-datos', '/apuntarme/'];
const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');

export function guard(pathname: string, user: SessionUser | null): 'allow' | 'login' | 'forbidden' {
  if (under(pathname, '/admin')) return !user ? 'login' : user.isAdmin ? 'allow' : 'forbidden';
  if (VOLUNTEER_PATHS.some((p) => under(pathname, p))) return user ? 'allow' : 'login';
  return 'allow';
}

export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : '/';
}

const redirectUri = () => `${process.env.SITE_URL}/login/google/callback`;

export function createPkce(): { state: string; verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  return { state: randomBytes(16).toString('base64url'), verifier, challenge: sha256(verifier).toString('base64url') };
}

export function googleAuthUrl(state: string, challenge: string): string {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return u.toString();
}

export async function exchangeGoogleCode(code: string, verifier: string): Promise<{ sub: string; email: string; emailVerified: boolean }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const { id_token } = (await res.json()) as { id_token: string };
  // id_token comes straight from Google's token endpoint over TLS, so OIDC allows skipping signature checks
  const claims = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString());
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) {
    throw new Error('Unexpected id_token audience or issuer');
  }
  return { sub: claims.sub, email: claims.email, emailVerified: claims.email_verified === true };
}
