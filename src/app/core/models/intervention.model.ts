/**
 * Intervention client (registre du suivi, onglet « Interventions » de l'Excel).
 * La marge est calculée automatiquement côté serveur (prixFacture − coutPieces).
 * Une intervention au statut « Terminé » avec un prix > 0 crée automatiquement
 * une entrée « Revenu client » en trésorerie.
 */
export interface Intervention {
  id?: string;
  /** Date de l'intervention (AAAA-MM-JJ). */
  date: string;
  client: string;
  telephone: string;
  appareil: string;
  probleme: string;
  service: string;
  /** Coût des pièces (au prix coûtant). */
  coutPieces: number;
  /** Prix facturé au client. */
  prixFacture: number;
  /** Marge = prixFacture − coutPieces (calculée serveur). */
  marge?: number;
  /** Mode de paiement (Interac / Comptant / Autre). */
  paiement: string;
  /** Statut (À planifier / En cours / Terminé / Annulé). */
  statut: string;
  /** Évaluation Google demandée ? */
  avisDemande: boolean;
  notes?: string;
  /** Lien vers l'entrée trésorerie générée automatiquement (interne). */
  tresorerieAuto?: string;
}

/** Valeurs possibles pour les listes déroulantes. */
export const PAIEMENTS = ['Interac', 'Comptant', 'Autre'] as const;
export const STATUTS_INTERVENTION = ['À planifier', 'En cours', 'Terminé', 'Annulé'] as const;
