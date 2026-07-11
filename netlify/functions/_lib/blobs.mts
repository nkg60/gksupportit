import { getStore } from '@netlify/blobs';

/**
 * Helpers d'accès à Netlify Blobs.
 * Toutes les données du site vivent dans un seul « store » clé-valeur JSON,
 * une clé par type de donnée (services, settings, demandes, interventions...).
 *
 * En dev (`netlify dev`) comme en production, getStore fonctionne sans
 * configuration : le runtime Netlify fournit automatiquement le contexte.
 */

const STORE_NAME = 'gk-data';

function store() {
  return getStore(STORE_NAME);
}

/** Lit une clé JSON, ou renvoie la valeur de repli si elle n'existe pas. */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await store().get(key, { type: 'json' });
  return (value as T) ?? fallback;
}

/** Écrit (remplace) une clé JSON. */
export async function writeJson<T>(key: string, value: T): Promise<void> {
  await store().setJSON(key, value);
}

/**
 * Renvoie la valeur d'une clé ; si elle est absente, l'initialise avec le seed
 * fourni (première visite) puis renvoie ce seed. Idempotent.
 */
export async function ensureSeeded<T>(key: string, seed: T): Promise<T> {
  const s = store();
  const existing = await s.get(key, { type: 'json' });
  if (existing == null) {
    await s.setJSON(key, seed);
    return seed;
  }
  return existing as T;
}
