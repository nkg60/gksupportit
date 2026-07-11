/**
 * Demande entrante (prospect) issue du formulaire public « Décrire mon problème ».
 * Sera enregistrée dans la clé Netlify Blobs « demandes » (Phase 2) puis
 * consultable dans l'espace admin.
 */
export interface Demande {
  /** Identifiant généré côté serveur (absent au moment de la soumission). */
  id?: string;
  /** Date ISO de la demande (ajoutée côté serveur). */
  date?: string;
  /** Nom du client. */
  nom: string;
  /** Téléphone ou numéro WhatsApp. */
  contact: string;
  /** Type d'appareil concerné. */
  appareil: string;
  /** Description libre du problème. */
  description: string;
  /** Service souhaité (optionnel). */
  service?: string;
  /** Secteur d'Ottawa. */
  secteur: string;
  /** Statut du suivi (défaut : « nouveau »). */
  statut?: string;
}

/** Statuts possibles d'une demande entrante. */
export const STATUTS_DEMANDE = ['nouveau', 'contacté', 'converti', 'clos'] as const;
