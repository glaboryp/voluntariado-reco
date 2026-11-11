import type { APIRoute } from 'astro';
import { getActivity, listAllActivities } from '../../../lib/activities';
import { buildWorkbook } from '../../../lib/export';
import { listSignups } from '../../../lib/signups';

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voluntariado';

export const GET: APIRoute = async ({ params }) => {
  const all = params.id === 'todo';
  const one = all ? null : await getActivity(Number(params.id));
  const activities = all ? await listAllActivities() : one ? [one] : [];
  if (!activities.length) return new Response('No hay voluntariados que exportar.', { status: 404 });

  const groups = await Promise.all(activities.map(async (activity) => ({ activity, people: await listSignups(activity.id) })));
  const filename = all ? 'voluntarias-todas.xlsx' : `voluntariado-${slug(one!.title)}.xlsx`;
  return new Response(new Uint8Array(await buildWorkbook(groups)), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};
