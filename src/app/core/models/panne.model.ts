/**
 * Panne du guide de diagnostic terrain (25 pannes, 6 familles).
 * Éditable depuis l'admin (comme les services) : le guide évoluera après les
 * premières interventions.
 */
export interface Panne {
  id?: string;
  /** Famille : lettre A à F (voir FAMILLES_PANNE). */
  famille: string;
  /** Numéro d'ordre (1 à 25). */
  numero: number;
  titre: string;
  /** Sous-titre décrivant le symptôme. */
  symptome: string;
  /** Arbre de vérification en 4 étapes (A, B, C, D). */
  etapes: string[];
  verdict: string;
  serviceRecommande: string;
  prix: string;
}

/** Libellés des familles de pannes. */
export const FAMILLES_PANNE: Record<string, string> = {
  A: 'A · Démarrage & alimentation',
  B: 'B · Performance & stabilité',
  C: 'C · Logiciel, système & sécurité',
  D: 'D · Réseau & connexions',
  E: 'E · Périphériques',
  F: 'F · Petites entreprises',
};
