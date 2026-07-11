import type { Config } from '@netlify/functions';
import { ensureSeeded } from './_lib/blobs.mjs';
import settingsSeed from './_data/settings.json';

/**
 * GET /api/settings
 * Renvoie les paramètres PUBLICS du site. Les données réservées à la gestion
 * interne (capitalDepart) sont retirées avant l'envoi au public.
 */
export default async (): Promise<Response> => {
  const settings = await ensureSeeded<Record<string, unknown>>('settings', settingsSeed);
  // On n'expose jamais le capital de départ côté public.
  const { capitalDepart, ...publicSettings } = settings;
  return Response.json(publicSettings, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
};

export const config: Config = { path: '/api/settings' };
