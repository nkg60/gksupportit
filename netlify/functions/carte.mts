import type { Config, Context } from '@netlify/functions';
import { ensureSeeded } from './_lib/blobs.mjs';
import cartesSeed from './_data/cartes.json';

/**
 * GET /api/carte/:slug  (public)
 * Renvoie une carte de visite ACTIVE correspondant au slug, ou 404.
 * Amorce la clé « cartes » depuis le seed au premier appel.
 */
interface Carte {
  slug: string;
  actif: boolean;
  [k: string]: unknown;
}

export default async (_req: Request, context: Context): Promise<Response> => {
  const slug = context.params?.slug as string;
  const cartes = await ensureSeeded<Carte[]>('cartes', cartesSeed as Carte[]);
  const carte = cartes.find((c) => c.slug === slug && c.actif);
  if (!carte) {
    return Response.json({ ok: false, error: 'Carte introuvable' }, { status: 404 });
  }
  return Response.json(carte, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
};

export const config: Config = { path: '/api/carte/:slug' };
