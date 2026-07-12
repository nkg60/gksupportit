import type { Config, Context } from '@netlify/functions';
import { readJson, writeJson } from './_lib/blobs.mjs';
import { estRobot, ipCliente, limiteDepassee } from './_lib/antispam.mjs';

/**
 * POST /api/submit-diagnostic  (public)
 * Enregistre un diagnostic complété dans la clé Blobs « demandes ».
 *
 * Règles :
 *  - Consentement OBLIGATOIRE : sans lui, rien n'est stocké (même pas anonymisé).
 *  - Au moins un moyen de contact (téléphone OU e-mail).
 *  - Anti-spam : honeypot + limite de débit par IP.
 *  - Le record remplit aussi les champs hérités (contact/appareil/description)
 *    pour rester compatible avec la vue admin existante.
 *
 * Ne lit ni n'expose JAMAIS la clé « pannes » (contenu technique interne).
 */
interface Entrante {
  nom?: string;
  telephone?: string;
  email?: string;
  secteur?: string;
  typeMachine?: string;
  symptomeChoisi?: string;
  reponses?: { question?: string; reponse?: string }[];
  panneIdentifiee?: string | null;
  serviceRecommande?: string;
  prixEstime?: string;
  gravite?: string;
  explication?: string;
  consentement?: boolean;
  statut?: string;
  /** Honeypot anti-robot (doit rester vide). */
  website?: string;
}

const STATUTS_AUTORISES = ['prospect', 'nouvelle-demande'];

function txt(v: unknown, max = 500): string {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  let body: Entrante;
  try {
    body = (await req.json()) as Entrante;
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  // Honeypot : on renvoie « ok » sans rien stocker (ne pas informer le robot).
  if (estRobot(body.website)) {
    return Response.json({ ok: true, id: null });
  }

  // Limite de débit par IP.
  const ip = ipCliente(req, context.ip);
  if (await limiteDepassee(ip)) {
    return Response.json(
      { ok: false, error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 },
    );
  }

  // Consentement OBLIGATOIRE — sinon aucun enregistrement.
  if (body.consentement !== true) {
    return Response.json(
      { ok: false, error: 'Le consentement est requis pour enregistrer vos coordonnées.' },
      { status: 400 },
    );
  }

  const nom = txt(body.nom, 120);
  const telephone = txt(body.telephone, 60);
  const email = txt(body.email, 160);
  if (!nom) {
    return Response.json({ ok: false, error: 'Nom manquant.' }, { status: 400 });
  }
  if (!telephone && !email) {
    return Response.json(
      { ok: false, error: 'Indiquez au moins un téléphone ou un e-mail.' },
      { status: 400 },
    );
  }

  const statut = STATUTS_AUTORISES.includes(String(body.statut)) ? String(body.statut) : 'prospect';
  const symptome = txt(body.symptomeChoisi, 160);
  const service = txt(body.serviceRecommande, 160);
  const estimation = txt(body.prixEstime, 160);
  const explication = txt(body.explication, 600);

  const reponses = Array.isArray(body.reponses)
    ? body.reponses.slice(0, 10).map((r) => ({ question: txt(r?.question, 200), reponse: txt(r?.reponse, 120) }))
    : [];

  const maintenant = new Date().toISOString();
  const demande = {
    id: crypto.randomUUID(),
    date: maintenant,
    // Champs hérités (compatibilité vue admin actuelle).
    nom,
    contact: telephone || email,
    appareil: txt(body.typeMachine, 160) || 'Non précisé',
    description:
      `Diagnostic en ligne — ${symptome || 'symptôme non précisé'}.` +
      (explication ? ` ${explication}` : '') +
      (estimation ? ` (Estimation : ${estimation})` : ''),
    service,
    secteur: txt(body.secteur, 120),
    // Champs riches du diagnostic.
    telephone,
    email,
    typeMachine: txt(body.typeMachine, 160),
    symptomeChoisi: symptome,
    reponses,
    panneIdentifiee: body.panneIdentifiee ? txt(body.panneIdentifiee, 40) : null,
    serviceRecommande: service,
    prixEstime: estimation,
    gravite: txt(body.gravite, 20),
    consentement: true,
    dateConsentement: maintenant,
    source: 'diagnostic-en-ligne',
    statut,
    notesAdmin: '',
  };

  const demandes = await readJson<unknown[]>('demandes', []);
  demandes.push(demande);
  await writeJson('demandes', demandes);

  return Response.json({ ok: true, id: demande.id });
};

export const config: Config = { path: '/api/submit-diagnostic' };
