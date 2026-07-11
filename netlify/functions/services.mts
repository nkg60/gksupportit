import type { Config } from '@netlify/functions';
import { ensureSeeded } from './_lib/blobs.mjs';
import servicesSeed from './_data/services.json';

/**
 * GET /api/services
 * Renvoie la liste PUBLIQUE des services : uniquement les services actifs,
 * triés par ordre d'affichage. Initialise Blobs depuis le seed au premier appel.
 */
interface Service {
  id: string;
  actif: boolean;
  ordre: number;
  [k: string]: unknown;
}

export default async (): Promise<Response> => {
  const all = await ensureSeeded<Service[]>('services', servicesSeed as Service[]);
  const publics = all.filter((s) => s.actif).sort((a, b) => a.ordre - b.ordre);
  return Response.json(publics, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
};

export const config: Config = { path: '/api/services' };
