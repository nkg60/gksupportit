/**
 * Carte de visite numérique.
 * Chaque carte a une page publique dédiée : /carte/:slug
 */
export interface Carte {
  id?: string;
  /** Identifiant d'URL (ex. « ghislain » → /carte/ghislain). */
  slug: string;
  nom: string;
  role: string;
  /** Téléphone affiché (ex. « +1 514 973 6569 »). */
  telephone: string;
  /** Numéro WhatsApp (chiffres, ex. « 15149736569 »). */
  whatsapp: string;
  email: string;
  /** Actif = carte accessible publiquement. */
  actif: boolean;
}
