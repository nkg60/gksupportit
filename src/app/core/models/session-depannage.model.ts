/**
 * Session de dépannage guidé menée pour un client.
 * Suit un symptôme (panne) et son arbre de vérification, jusqu'au verdict,
 * puis peut être convertie en intervention.
 */
export interface EtapeCochee {
  /** Étape effectuée ? */
  coche: boolean;
  /** Résultat / note de l'admin pour cette étape. */
  note: string;
}

export interface SessionDepannage {
  id?: string;
  date: string;
  client: string;
  appareil: string;
  /** Panne (symptôme) choisie. */
  panneId: string;
  /** Titre de la panne au moment de la session (trace). */
  panneTitre?: string;
  /** État des 4 étapes de vérification. */
  etapesCochees: EtapeCochee[];
  /** Verdict retenu. */
  verdict?: string;
  serviceRecommande?: string;
  prix?: string;
  /** Convertie en intervention ? */
  convertieEnIntervention?: boolean;
}
