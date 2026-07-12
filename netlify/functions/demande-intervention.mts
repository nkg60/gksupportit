import type { Config, Context } from '@netlify/functions';
import { readJson, writeJson } from './_lib/blobs.mjs';
import { ipCliente, limiteDepassee } from './_lib/antispam.mjs';

/**
 * POST /api/demande-intervention  (public, borné)
 * Promeut une demande issue du diagnostic de « prospect » à « nouvelle-demande »
 * lorsque le visiteur clique « Demander une intervention » depuis son résultat.
 *
 * Opération volontairement TRÈS limitée pour rester sûre sans authentification :
 *  - agit uniquement sur une demande « source = diagnostic-en-ligne » ;
 *  - seule la transition « prospect » → « nouvelle-demande » est permise ;
 *  - aucune autre donnée n'est modifiable par cet endpoint.
 */
interface Entrante {
  id?: string;
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  if (await limiteDepassee(ipCliente(req, context.ip))) {
    return Response.json({ ok: false, error: 'Trop de demandes.' }, { status: 429 });
  }

  let body: Entrante;
  try {
    body = (await req.json()) as Entrante;
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!id) return Response.json({ ok: false, error: 'id requis' }, { status: 400 });

  const demandes = await readJson<Record<string, unknown>[]>('demandes', []);
  const cible = demandes.find((d) => d.id === id);

  // Bornage strict : seule une demande de diagnostic au statut « prospect ».
  if (
    !cible ||
    cible.source !== 'diagnostic-en-ligne' ||
    (cible.statut !== 'prospect' && cible.statut !== 'nouvelle-demande')
  ) {
    return Response.json({ ok: false, error: 'Demande introuvable' }, { status: 404 });
  }

  cible.statut = 'nouvelle-demande';
  await writeJson('demandes', demandes);

  return Response.json({ ok: true });
};

export const config: Config = { path: '/api/demande-intervention' };
