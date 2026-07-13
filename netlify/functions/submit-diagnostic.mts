import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { readJson, writeJson } from './_lib/blobs.mjs';
import { notifierAdmin } from './_lib/push.mjs';
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
  casInconnu?: boolean;
  descriptionLibre?: string;
  /** Photo facultative (Cas 2), base64 sans préfixe + type MIME. */
  photoBase64?: string;
  photoType?: string;
  /** Honeypot anti-robot (doit rester vide). */
  website?: string;
}

const STATUTS_AUTORISES = ['prospect', 'nouvelle-demande'];
const TYPES_PHOTO = ['image/webp', 'image/jpeg', 'image/png'];
const TAILLE_MAX_PHOTO = 2 * 1024 * 1024; // 2 Mo (déjà redimensionnée côté client)

/**
 * Stocke la photo d'un cas inconnu dans le store « gk-images » et renvoie son
 * URL publique (/api/image/:key), ou null si la photo est absente ou invalide.
 * Une photo invalide n'empêche JAMAIS l'enregistrement de la demande.
 */
async function stockerPhoto(body: Entrante, demandeId: string): Promise<string | null> {
  const base64 = String(body.photoBase64 ?? '');
  const contentType = String(body.photoType ?? '');
  if (!base64 || !TYPES_PHOTO.includes(contentType)) return null;
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength === 0 || bytes.byteLength > TAILLE_MAX_PHOTO) return null;
    const ext = contentType.split('/')[1];
    const key = `cas-${demandeId}.${ext}`;
    const store = getStore('gk-images');
    await store.set(key, bytes.buffer, { metadata: { contentType, filename: key } });
    return `/api/image/${key}`;
  } catch {
    return null;
  }
}

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

  // Un cas non répertorié (non concluant ou « Autre ») est prioritaire côté admin.
  const casInconnu = body.casInconnu === true;
  const statut = casInconnu
    ? 'cas-inconnu'
    : STATUTS_AUTORISES.includes(String(body.statut))
      ? String(body.statut)
      : 'prospect';
  const symptome = txt(body.symptomeChoisi, 160);
  const service = txt(body.serviceRecommande, 160);
  const estimation = txt(body.prixEstime, 160);
  const explication = txt(body.explication, 600);

  const reponses = Array.isArray(body.reponses)
    ? body.reponses.slice(0, 10).map((r) => ({ question: txt(r?.question, 200), reponse: txt(r?.reponse, 120) }))
    : [];

  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  // Photo acceptée uniquement pour un cas inconnu (champ libre « Autre »).
  const photoUrl = casInconnu ? await stockerPhoto(body, id) : null;
  const demande = {
    id,
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
    casInconnu,
    descriptionLibre: txt(body.descriptionLibre, 1000),
    photoUrl,
    notesAdmin: '',
  };

  const demandes = await readJson<unknown[]>('demandes', []);
  demandes.push(demande);
  await writeJson('demandes', demandes);

  // Notification adaptée au type : cas inconnu (prioritaire) / intervention / prospect.
  const notif = casInconnu
    ? { title: '❓ Cas non répertorié', body: `${nom} — à rappeler en priorité`, url: '/admin/cas-inconnus' }
    : statut === 'nouvelle-demande'
      ? { title: '🔥 Demande d’intervention', body: `${nom} — ${symptome || 'diagnostic en ligne'}`, url: '/admin/demandes' }
      : { title: '🧭 Nouveau diagnostic', body: `${nom} — ${symptome || 'diagnostic en ligne'}`, url: '/admin/demandes' };
  await notifierAdmin(notif);

  return Response.json({ ok: true, id: demande.id });
};

export const config: Config = { path: '/api/submit-diagnostic' };
