import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * GET /api/image/:key  (public)
 * Renvoie une image stockée dans Blobs (store « gk-images ») avec son type MIME.
 * Les clés étant uniques par téléversement, on met un cache long (immutable).
 */
export default async (_req: Request, context: Context): Promise<Response> => {
  const key = context.params?.key as string;
  if (!key) return new Response('Clé manquante', { status: 400 });

  const store = getStore('gk-images');
  const res = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!res) return new Response('Image introuvable', { status: 404 });

  const contentType = (res.metadata?.contentType as string) || 'application/octet-stream';
  return new Response(res.data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const config: Config = { path: '/api/image/:key' };
