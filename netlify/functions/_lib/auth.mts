import { SignJWT, jwtVerify } from 'jose';

/**
 * Signature et vérification des jetons de session admin (JWT, HS256).
 * Le secret provient de la variable d'environnement JWT_SECRET (jamais en dur).
 */

const encoder = new TextEncoder();

/** Clé de signature dérivée de JWT_SECRET. */
function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans les variables d’environnement.');
  }
  return encoder.encode(secret);
}

/** Durée de validité du jeton (2 heures). */
export const DUREE_JETON_SECONDES = 2 * 60 * 60;

/** Signe un jeton admin. */
export async function signAdminToken(): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JETON_SECONDES}s`)
    .sign(secretKey());
  return { token, expiresIn: DUREE_JETON_SECONDES };
}

/** Vérifie un jeton et renvoie true s'il est valide et de rôle « admin ». */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
