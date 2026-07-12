import { readJson, writeJson } from './blobs.mjs';

/**
 * Anti-spam léger pour les fonctions publiques (sans authentification).
 *  - Honeypot : un champ invisible (« website ») que seuls les robots remplissent ;
 *  - Limite de débit par IP : fenêtre glissante stockée dans Blobs.
 *
 * Suffisant pour un site vitrine à faible trafic ; ce n'est pas une protection
 * anti-DDoS. On reste volontairement simple et sans dépendance.
 */

const CLE_LIMITE = 'ratelimit';
const FENETRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PAR_FENETRE = 6; // 6 soumissions / 10 min / IP

/** Le champ honeypot est-il rempli ? (→ robot). */
export function estRobot(honeypot: unknown): boolean {
  return typeof honeypot === 'string' && honeypot.trim() !== '';
}

/** Récupère l'IP cliente depuis le contexte Netlify ou les en-têtes. */
export function ipCliente(req: Request, ip?: string): string {
  if (ip) return ip;
  const fwd = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for');
  return (fwd ?? 'inconnue').split(',')[0].trim();
}

/**
 * Enregistre une tentative pour cette IP et indique si la limite est dépassée.
 * @returns true si la requête doit être BLOQUÉE (trop de tentatives).
 */
export async function limiteDepassee(ip: string): Promise<boolean> {
  const maintenant = Date.now();
  const journal = await readJson<Record<string, number[]>>(CLE_LIMITE, {});

  // Purge des horodatages hors fenêtre pour cette IP.
  const recents = (journal[ip] ?? []).filter((t) => maintenant - t < FENETRE_MS);

  if (recents.length >= MAX_PAR_FENETRE) {
    journal[ip] = recents; // on réécrit la version purgée
    await ecrireJournalPurge(journal, maintenant);
    return true;
  }

  recents.push(maintenant);
  journal[ip] = recents;
  await ecrireJournalPurge(journal, maintenant);
  return false;
}

/** Écrit le journal en purgeant au passage les IP entièrement expirées. */
async function ecrireJournalPurge(
  journal: Record<string, number[]>,
  maintenant: number,
): Promise<void> {
  for (const [cle, ts] of Object.entries(journal)) {
    const restants = ts.filter((t) => maintenant - t < FENETRE_MS);
    if (restants.length) journal[cle] = restants;
    else delete journal[cle];
  }
  await writeJson(CLE_LIMITE, journal);
}
