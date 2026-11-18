import type { APIRoute } from 'astro';
import { sendReminders } from '../../lib/reminders';

export const GET: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  return Response.json(await sendReminders());
};
