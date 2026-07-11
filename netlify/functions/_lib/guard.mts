import { verifyAdminToken } from './auth.mjs';

/**
 * Protège une fonction admin : lit l'en-tête « Authorization: Bearer <jeton> »
 * et vérifie le JWT.
 *
 * @returns null si la requête est autorisée, sinon une réponse 401 à renvoyer.
 */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !(await verifyAdminToken(match[1]))) {
    return Response.json({ ok: false, error: 'Non autorisé' }, { status: 401 });
  }
  return null;
}
