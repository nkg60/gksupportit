/**
 * Mouvement de trésorerie (journal, onglet « Trésorerie » de l'Excel).
 * Entrée = argent qui rentre ; Sortie = argent qui sort.
 */
export interface Mouvement {
  id?: string;
  /** Date du mouvement (AAAA-MM-JJ). */
  date: string;
  type: 'Entrée' | 'Sortie';
  /** Montant (toujours positif). */
  montant: number;
  categorie: string;
  description: string;
  /** true si généré automatiquement depuis une intervention payée. */
  auto?: boolean;
  /** Intervention liée (pour les entrées automatiques). */
  interventionId?: string;
}

/** Catégories de trésorerie suggérées. */
export const CATEGORIES_TRESORERIE = [
  'Capital',
  'Revenu client',
  'Matériel',
  'Pièces',
  'Marketing',
  'Transport',
  'Frais',
] as const;
