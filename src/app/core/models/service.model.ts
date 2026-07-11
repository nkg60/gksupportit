/**
 * Modèle d'un service (offre) proposé par GK SupportIT.
 * Les prix sont conservés en texte car certains ne sont pas numériques
 * (« sur devis », « Gratuit si réparation », « + pièce au prix coûtant »).
 * Ces données seront éditables depuis l'espace admin (Phase 4).
 */
export interface Service {
  /** Identifiant stable (slug) — sert aux clés Netlify Blobs et aux URLs. */
  id: string;
  /** Nom affiché du service. */
  nom: string;
  /** Prix du marché à Ottawa (affiché barré). */
  prixMarche: string;
  /** Prix GK SupportIT (mis en avant). */
  prixGK: string;
  /** Description en langage simple, orientée client. */
  description: string;
  /** Nom de fichier de l'affiche (dans /assets/posters) ou URL Netlify Blobs. */
  image: string;
  /** Ordre d'affichage dans la grille. */
  ordre: number;
  /** Actif = visible sur le site public. */
  actif: boolean;
}
