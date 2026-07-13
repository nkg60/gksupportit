import type { Config } from '@netlify/functions';
import { requireAdmin } from './_lib/guard.mjs';
import { readJson, writeJson } from './_lib/blobs.mjs';
import type { AbonnementPush } from './_lib/push.mjs';

/**
 * Endpoints admin des notifications push (protégés par JWT) :
 *   GET  /api/admin/push/key         → clé publique VAPID (pour s'abonner)
 *   POST /api/admin/push/subscribe   → enregistre l'abonnement du navigateur
 *   POST /api/admin/push/unsubscribe → retire l'abonnement (par endpoint)
 */

const CLE = 'push-subscriptions';

export default async (req: Request): Promise<Response> => {
  const refus = await requireAdmin(req);
  if (refus) return refus;

  const chemin = new URL(req.url).pathname;

  // Clé publique VAPID (nécessaire au navigateur pour créer l'abonnement).
  if (chemin.endsWith('/key')) {
    const key = process.env.VAPID_PUBLIC_KEY ?? '';
    return Response.json({ ok: !!key, key });
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  let body: (AbonnementPush & { endpoint?: string }) | null;
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return Response.json({ ok: false, error: 'Abonnement invalide' }, { status: 400 });
  }

  const abonnements = await readJson<AbonnementPush[]>(CLE, []);

  if (chemin.endsWith('/unsubscribe')) {
    await writeJson(
      CLE,
      abonnements.filter((a) => a.endpoint !== endpoint),
    );
    return Response.json({ ok: true });
  }

  // subscribe : upsert (dédoublonné par endpoint).
  const autres = abonnements.filter((a) => a.endpoint !== endpoint);
  autres.push(body as AbonnementPush);
  await writeJson(CLE, autres);
  return Response.json({ ok: true });
};

export const config: Config = {
  path: ['/api/admin/push/key', '/api/admin/push/subscribe', '/api/admin/push/unsubscribe'],
};
