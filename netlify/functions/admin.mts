import type { Config, Context } from '@netlify/functions';
import { requireAdmin } from './_lib/guard.mjs';
import { ensureSeeded, readJson, writeJson } from './_lib/blobs.mjs';
import servicesSeed from './_data/services.json';
import settingsSeed from './_data/settings.json';
import tresorerieSeed from './_data/tresorerie.json';
import pannesSeed from './_data/pannes.json';
import cartesSeed from './_data/cartes.json';
import diagnosticPublicSeed from './_data/diagnostic-public.json';

/** Données initiales par clé (amorçage Blobs au premier accès). */
const SEEDS: Record<string, unknown> = {
  services: servicesSeed,
  settings: settingsSeed,
  tresorerie: tresorerieSeed,
  pannes: pannesSeed,
  cartes: cartesSeed,
  'diagnostic-public': diagnosticPublicSeed,
};

/** Lit une clé en l'amorçant depuis son seed si elle est absente. */
async function chargerStore<T>(store: string, defaut: T): Promise<T> {
  if (store in SEEDS) return ensureSeeded<T>(store, SEEDS[store] as T);
  return readJson<T>(store, defaut);
}

/**
 * CRUD générique protégé (JWT admin requis) sur les clés Netlify Blobs.
 *
 *   GET    /api/admin/data/:store          -> liste (ou objet pour settings)
 *   GET    /api/admin/data/:store/:id       -> un élément
 *   POST   /api/admin/data/:store           -> crée un élément (id auto)
 *   PUT    /api/admin/data/:store           -> remplace l'objet (settings)
 *   PUT    /api/admin/data/:store/:id        -> met à jour un élément
 *   DELETE /api/admin/data/:store/:id        -> supprime un élément
 *
 * Règle métier : une intervention au statut « Terminé » avec un prix facturé
 * crée/maintient automatiquement une entrée « Revenu client » en trésorerie
 * (évite la double saisie). La marge est recalculée à chaque enregistrement.
 */

// Types souples : les données sont des JSON génériques.
type Item = Record<string, any>;

/** Clés stockées sous forme de tableau. */
const STORES_TABLEAU = [
  'services',
  'tresorerie',
  'interventions',
  'demandes',
  'pannes',
  'sessions',
  'cartes',
];
/** Clés stockées sous forme d'objet unique. */
const STORES_OBJET = ['settings', 'diagnostic-public'];

export default async (req: Request, context: Context): Promise<Response> => {
  // 1) Authentification obligatoire.
  const refus = await requireAdmin(req);
  if (refus) return refus;

  const store = context.params?.store as string;
  const id = context.params?.id as string | undefined;

  if (![...STORES_TABLEAU, ...STORES_OBJET].includes(store)) {
    return Response.json({ ok: false, error: 'Ressource inconnue' }, { status: 404 });
  }

  // 2) Cas « objet unique » (settings).
  if (STORES_OBJET.includes(store)) {
    if (req.method === 'GET') {
      return Response.json(await chargerStore<Item>(store, {}));
    }
    if (req.method === 'PUT') {
      const body = (await req.json()) as Item;
      await writeJson(store, body);
      return Response.json({ ok: true, item: body });
    }
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  // 3) Cas « tableau ».
  const items = await chargerStore<Item[]>(store, []);

  switch (req.method) {
    case 'GET': {
      if (id) {
        const found = items.find((x) => x.id === id);
        return found
          ? Response.json(found)
          : Response.json({ ok: false, error: 'Introuvable' }, { status: 404 });
      }
      return Response.json(items);
    }

    case 'POST': {
      const body = (await req.json()) as Item;
      const item: Item = { ...body, id: body.id || crypto.randomUUID() };
      if (!item.date) item.date = new Date().toISOString();
      if (store === 'interventions') calculerMarge(item);
      items.push(item);
      await writeJson(store, items);
      if (store === 'interventions') await synchroniserTresorerie(item);
      return Response.json({ ok: true, item });
    }

    case 'PUT': {
      if (!id) return Response.json({ ok: false, error: 'id requis' }, { status: 400 });
      const idx = items.findIndex((x) => x.id === id);
      if (idx < 0) return Response.json({ ok: false, error: 'Introuvable' }, { status: 404 });
      const body = (await req.json()) as Item;
      const item: Item = { ...items[idx], ...body, id };
      if (store === 'interventions') calculerMarge(item);
      items[idx] = item;
      await writeJson(store, items);
      if (store === 'interventions') await synchroniserTresorerie(item);
      return Response.json({ ok: true, item });
    }

    case 'DELETE': {
      if (!id) return Response.json({ ok: false, error: 'id requis' }, { status: 400 });
      const idx = items.findIndex((x) => x.id === id);
      if (idx < 0) return Response.json({ ok: false, error: 'Introuvable' }, { status: 404 });
      items.splice(idx, 1);
      await writeJson(store, items);
      if (store === 'interventions') await retirerTresorerieAuto(id);
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }
};

/** Marge = prix facturé - coût des pièces. */
function calculerMarge(intervention: Item): void {
  const prix = Number(intervention.prixFacture) || 0;
  const pieces = Number(intervention.coutPieces) || 0;
  intervention.marge = prix - pieces;
}

/**
 * Crée / met à jour / retire l'entrée « Revenu client » liée à une intervention
 * selon qu'elle est « Terminé » (payée) ou non. Idempotent grâce au lien
 * interventionId + drapeau auto.
 */
async function synchroniserTresorerie(intervention: Item): Promise<void> {
  const tres = await chargerStore<Item[]>('tresorerie', []);
  const idx = tres.findIndex((t) => t.auto && t.interventionId === intervention.id);
  const payee = intervention.statut === 'Terminé' && (Number(intervention.prixFacture) || 0) > 0;

  if (payee) {
    const entree: Item = {
      type: 'Entrée',
      montant: Number(intervention.prixFacture) || 0,
      categorie: 'Revenu client',
      description:
        `Revenu intervention — ${intervention.client ?? ''}` +
        (intervention.service ? ` — ${intervention.service}` : ''),
      date: intervention.date,
      auto: true,
      interventionId: intervention.id,
    };
    if (idx >= 0) tres[idx] = { ...tres[idx], ...entree };
    else tres.push({ id: crypto.randomUUID(), ...entree });
    await writeJson('tresorerie', tres);
  } else if (idx >= 0) {
    tres.splice(idx, 1);
    await writeJson('tresorerie', tres);
  }
}

/** Retire l'entrée trésorerie auto liée à une intervention supprimée. */
async function retirerTresorerieAuto(interventionId: string): Promise<void> {
  const tres = await chargerStore<Item[]>('tresorerie', []);
  const restant = tres.filter((t) => !(t.auto && t.interventionId === interventionId));
  if (restant.length !== tres.length) await writeJson('tresorerie', restant);
}

export const config: Config = {
  path: ['/api/admin/data/:store', '/api/admin/data/:store/:id'],
};
