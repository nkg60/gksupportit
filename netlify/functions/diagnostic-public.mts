import type { Config } from '@netlify/functions';
import { ensureSeeded } from './_lib/blobs.mjs';
import seed from './_data/diagnostic-public.json';

/**
 * GET /api/diagnostic-public  (public, lecture seule)
 * Renvoie l'arbre de décision du « Diagnostic gratuit », amorcé depuis le seed
 * au premier accès. Édité depuis l'admin (PUT /api/admin/data/diagnostic-public)
 * → les modifications sont servies ici sans redéploiement.
 *
 * Ne contient JAMAIS de procédure de réparation (clé « pannes » non exposée).
 */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }
  const arbre = (await ensureSeeded('diagnostic-public', seed)) as {
    version: number;
    symptomes: { brouillon?: boolean }[];
  };
  // Les brouillons (créés depuis l'admin) ne sont JAMAIS servis au public.
  const publie = {
    ...arbre,
    symptomes: (arbre.symptomes ?? []).filter((s) => !s.brouillon),
  };
  return Response.json(publie);
};

export const config: Config = { path: '/api/diagnostic-public' };
