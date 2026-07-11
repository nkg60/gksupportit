/**
 * Paramètres généraux du site (clé Netlify Blobs « settings »).
 * Éditables depuis l'admin (Phase 4). En Phase 1 ils sont fournis en dur
 * via un seed, mais chaque page les lit toujours à travers ContentService
 * pour que le passage au stockage distant (Phase 2) soit transparent.
 */
export interface SiteSettings {
  /** Numéro WhatsApp au format international, chiffres uniquement (ex. « 15149736569 »). */
  whatsappNumber: string;
  /** Version lisible du numéro pour l'affichage (ex. « +1 514 973 6569 »). */
  whatsappDisplay: string;
  /** Courriel de contact. */
  email: string;
  /** Lien vers le compte Instagram de l'entreprise (optionnel). */
  instagram?: string;
  /** Horaires d'ouverture (texte libre). */
  horaires: string;
  /** Zone de service couverte. */
  zoneService: string;
  /** Supplément appliqué hors de la zone principale. */
  supplementHorsZone: string;
  /** Texte « À propos » éditable. */
  aboutText: string;
  /** Capital de départ, pour le tableau de bord admin. */
  capitalDepart: number;
}
