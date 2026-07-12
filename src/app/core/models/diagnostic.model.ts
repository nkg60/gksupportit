/**
 * Modèle du « Diagnostic gratuit » public.
 *
 * L'arbre de décision (clé Blobs « diagnostic-public ») est dérivé des 25 pannes
 * admin mais en langage grand public. Il ne contient JAMAIS de procédure de
 * réparation : uniquement l'identification du problème, sa gravité, le service
 * recommandé et une estimation. Le contenu technique reste dans la clé « pannes ».
 */

/** Niveau de gravité présenté au visiteur. */
export type GraviteDiagnostic = 'benin' | 'surveiller' | 'urgent';

/** Une réponse possible à une question (langage simple). */
export interface OptionDiagnostic {
  label: string;
  valeur: string;
}

/** Une question de précision (2 à 4 par symptôme). */
export interface QuestionDiagnostic {
  id: string;
  libelle: string;
  options: OptionDiagnostic[];
}

/** Résultat produit par une règle (ou le résultat par défaut). */
export interface ResultatRegle {
  /** Lien vers la panne admin correspondante (traçabilité — jamais affiché). */
  panneId: string | null;
  gravite: GraviteDiagnostic;
  /** Identifiant du service recommandé (→ carte service publique). */
  serviceId: string;
  /** Estimation de prix, en langage simple (ex. « environ 70 $ »). */
  prixEstime: string;
  /** Explication du problème en langage non technique. */
  explication: string;
  /** Alerte de prudence éventuelle (ex. « n'utilisez plus l'ordinateur »). */
  alerte: string | null;
}

/** Règle : si toutes les conditions sont vraies, alors ce résultat. */
export interface RegleDiagnostic {
  /** Conditions (id de question → valeur attendue), évaluées en ET. */
  si: Record<string, string>;
  alors: ResultatRegle;
}

/** Un symptôme (carte cliquable) et son arbre de précisions. */
export interface SymptomeDiagnostic {
  id: string;
  libellePublic: string;
  icone: string;
  /** Groupe d'affichage (regroupement visuel des cartes). */
  groupe: string;
  /** Symptôme « Autre » : champ libre au lieu de questions à choix. */
  champLibre?: boolean;
  questions: QuestionDiagnostic[];
  regles: RegleDiagnostic[];
  resultatParDefaut: ResultatRegle;
}

/** L'arbre complet (clé Blobs « diagnostic-public »). */
export interface ArbreDiagnostic {
  version: number;
  symptomes: SymptomeDiagnostic[];
}

/** Résultat final résolu, enrichi du contexte du symptôme choisi. */
export interface DiagnosticResolu extends ResultatRegle {
  symptomeId: string;
  symptomeLibelle: string;
}

/** Charge utile envoyée à /api/submit-diagnostic (contact + diagnostic résolu). */
export interface DiagnosticSubmission {
  nom: string;
  telephone: string;
  email: string;
  secteur: string;
  typeMachine: string;
  symptomeChoisi: string;
  reponses: { question: string; reponse: string }[];
  panneIdentifiee: string | null;
  serviceRecommande: string;
  prixEstime: string;
  gravite: GraviteDiagnostic;
  explication: string;
  consentement: boolean;
  /** « prospect » (diagnostic seul) ou « nouvelle-demande » (intervention). */
  statut: 'prospect' | 'nouvelle-demande';
  /** Honeypot anti-robot (toujours vide côté humain). */
  website: string;
}

/** Libellé + pictogramme de chaque niveau de gravité. */
export const LIBELLES_GRAVITE: Record<GraviteDiagnostic, { label: string; icone: string }> = {
  benin: { label: 'Bénin', icone: '✅' },
  surveiller: { label: 'À surveiller', icone: '⚠️' },
  urgent: { label: 'Urgent', icone: '🔴' },
};
