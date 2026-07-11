import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { requireAdmin } from './_lib/guard.mjs';

/**
 * POST /api/admin/upload  (protégé)
 * Reçoit une image encodée en base64 et la stocke dans le store Blobs
 * « gk-images ». Renvoie l'URL publique de récupération (/api/image/:key).
 *
 * Corps attendu : { filename, contentType, dataBase64 }
 *   - contentType : « image/webp », « image/jpeg », « image/png »
 *   - dataBase64  : contenu de l'image en base64 (sans préfixe data:)
 */

const TYPES_AUTORISES = ['image/webp', 'image/jpeg', 'image/png'];
const TAILLE_MAX = 4 * 1024 * 1024; // 4 Mo

function assainir(nom: string): string {
  return (nom || 'image')
    .replace(/\.[^.]+$/, '') // retire l'extension d'origine
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .slice(0, 60);
}

export default async (req: Request): Promise<Response> => {
  const refus = await requireAdmin(req);
  if (refus) return refus;

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  let body: { filename?: string; contentType?: string; dataBase64?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  const contentType = String(body.contentType ?? '');
  if (!TYPES_AUTORISES.includes(contentType)) {
    return Response.json(
      { ok: false, error: 'Type d’image non autorisé (WebP, JPEG ou PNG).' },
      { status: 400 },
    );
  }

  const base64 = String(body.dataBase64 ?? '');
  if (!base64) {
    return Response.json({ ok: false, error: 'Image manquante' }, { status: 400 });
  }

  // Décodage base64 -> octets.
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > TAILLE_MAX) {
    return Response.json(
      { ok: false, error: 'Image trop volumineuse (max 4 Mo).' },
      { status: 413 },
    );
  }

  const ext = contentType.split('/')[1] ?? 'img';
  const key = `${crypto.randomUUID()}-${assainir(body.filename ?? '')}.${ext}`;

  const store = getStore('gk-images');
  await store.set(key, bytes.buffer, { metadata: { contentType, filename: body.filename ?? '' } });

  return Response.json({ ok: true, key, url: `/api/image/${key}` });
};

export const config: Config = { path: '/api/admin/upload' };
