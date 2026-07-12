import type { Config } from '@netlify/functions';
import { readJson, writeJson } from './_lib/blobs.mjs';

/**
 * POST /api/demande
 * Enregistre une demande entrante (prospect) issue du formulaire public
 * « Décrire mon problème » dans la clé Blobs « demandes ».
 */
interface DemandeEntrante {
  nom?: string;
  contact?: string;
  appareil?: string;
  description?: string;
  service?: string;
  secteur?: string;
}

const CHAMPS_REQUIS: (keyof DemandeEntrante)[] = [
  'nom',
  'contact',
  'appareil',
  'description',
  'secteur',
];

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  let body: DemandeEntrante;
  try {
    body = (await req.json()) as DemandeEntrante;
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  // Validation minimale côté serveur (ne jamais faire confiance au client).
  for (const champ of CHAMPS_REQUIS) {
    const val = body?.[champ];
    if (!val || String(val).trim() === '') {
      return Response.json({ ok: false, error: `Champ manquant : ${champ}` }, { status: 400 });
    }
  }

  const demande = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    nom: String(body.nom).trim(),
    contact: String(body.contact).trim(),
    appareil: String(body.appareil).trim(),
    description: String(body.description).trim(),
    service: body.service ? String(body.service).trim() : '',
    secteur: String(body.secteur).trim(),
    source: 'formulaire-libre',
    statut: 'nouvelle-demande',
  };

  const demandes = await readJson<unknown[]>('demandes', []);
  demandes.push(demande);
  await writeJson('demandes', demandes);

  return Response.json({ ok: true, id: demande.id });
};

export const config: Config = { path: '/api/demande' };
