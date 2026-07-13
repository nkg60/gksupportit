/**
 * Demande entrante enregistrée dans la clé Netlify Blobs « demandes » puis
 * consultable dans l'espace admin. Deux origines partagent la même clé
 * (différenciées par « source ») :
 *   - « formulaire-libre »     : page publique « Décrire mon problème » ;
 *   - « diagnostic-en-ligne »  : parcours « Diagnostic gratuit » (/diagnostic).
 *
 * Les champs hérités (contact, appareil, description) sont toujours renseignés,
 * y compris pour un diagnostic (mappés depuis téléphone/e-mail, type de machine
 * et un résumé), afin que la vue admin les affiche et que la conversion en
 * intervention fonctionne sans double saisie.
 */
export interface Demande {
  /** Identifiant généré côté serveur (absent au moment de la soumission). */
  id?: string;
  /** Date ISO de la demande (ajoutée côté serveur). */
  date?: string;
  /** Nom du client. */
  nom: string;
  /** Téléphone/e-mail regroupés (hérité) — pour l'affichage et WhatsApp. */
  contact: string;
  /** Type d'appareil concerné (hérité) — = typeMachine pour un diagnostic. */
  appareil: string;
  /** Description libre du problème (hérité) — résumé pour un diagnostic. */
  description: string;
  /** Service souhaité (optionnel). */
  service?: string;
  /** Secteur d'Ottawa. */
  secteur: string;
  /** Statut du suivi. */
  statut?: string;
  /** Origine de la demande. */
  source?: DemandeSource;

  // --- Champs spécifiques au diagnostic en ligne (facultatifs) ---
  /** Téléphone / WhatsApp saisi. */
  telephone?: string;
  /** E-mail saisi. */
  email?: string;
  /** Type de machine (portable / fixe / marque-modèle). */
  typeMachine?: string;
  /** Libellé du symptôme choisi (langage public). */
  symptomeChoisi?: string;
  /** Réponses données, en clair (question → réponse). */
  reponses?: ReponseDiagnostic[];
  /** Panne admin identifiée (traçabilité). */
  panneIdentifiee?: string | null;
  /** Service recommandé par le diagnostic. */
  serviceRecommande?: string;
  /** Estimation de prix présentée. */
  prixEstime?: string;
  /** Gravité présentée (benin / surveiller / urgent). */
  gravite?: string;
  /** Consentement explicite donné. */
  consentement?: boolean;
  /** Date ISO du consentement. */
  dateConsentement?: string;
  /** Notes internes de l'admin. */
  notesAdmin?: string;
  /** Marqué « à relancer » par l'admin (réserve commerciale). */
  aRelancer?: boolean;
  /** Cas non répertorié (diagnostic non concluant ou « Autre »). */
  casInconnu?: boolean;
  /** Description libre du visiteur (Cas 2 « Autre »). */
  descriptionLibre?: string;
  /** Photo envoyée par le visiteur (URL /api/image/…). */
  photoUrl?: string;
}

/** Réponse en clair, telle qu'affichée à l'admin. */
export interface ReponseDiagnostic {
  question: string;
  reponse: string;
}

/** Origines possibles d'une demande. */
export type DemandeSource = 'formulaire-libre' | 'diagnostic-en-ligne';

/**
 * Statuts unifiés du suivi commercial.
 *  - prospect        : diagnostic complété avec consentement, sans demande ferme ;
 *  - nouvelle-demande: le client demande explicitement une intervention (chaud) ;
 *  - contacté / converti / perdu : suivi.
 */
export const STATUTS_DEMANDE = [
  'cas-inconnu',
  'prospect',
  'nouvelle-demande',
  'contacté',
  'converti',
  'perdu',
] as const;

/** Statuts considérés comme « à traiter » (pour le badge de navigation). */
export const STATUTS_A_TRAITER: readonly string[] = [
  'cas-inconnu',
  'prospect',
  'nouvelle-demande',
];
