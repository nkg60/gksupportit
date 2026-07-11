import type { Config } from '@netlify/functions';
import { signAdminToken } from './_lib/auth.mjs';

/**
 * POST /api/admin/login
 * Vérifie le mot de passe admin (variable d'env ADMIN_PASSWORD) et renvoie
 * un jeton de session JWT en cas de succès.
 */

/** Comparaison à temps quasi constant (limite les attaques temporelles). */
function egaliteSure(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Méthode non autorisée' }, { status: 405 });
  }

  const attendu = process.env.ADMIN_PASSWORD;
  if (!attendu) {
    return Response.json(
      { ok: false, error: 'Serveur non configuré (ADMIN_PASSWORD manquant).' },
      { status: 500 },
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  const password = String(body?.password ?? '');
  if (!egaliteSure(password, attendu)) {
    return Response.json({ ok: false, error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const { token, expiresIn } = await signAdminToken();
  return Response.json({ ok: true, token, expiresIn });
};

export const config: Config = { path: '/api/admin/login' };
