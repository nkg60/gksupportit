import { Injectable, signal } from '@angular/core';

/** Brouillon de panne pré-rempli à partir d'un cas non répertorié. */
export interface PanneDraft {
  /** Titre suggéré (résumé du problème décrit). */
  titre: string;
  /** Sous-titre / description du symptôme (mots du client). */
  symptome: string;
  /** Réponses données par le client pendant le parcours (question → réponse). */
  reponses?: { question: string; reponse: string }[];
  /** Photo envoyée par le client (URL /api/image/…). */
  photoUrl?: string;
  /** Id de la demande d'origine (traçabilité). */
  demandeId?: string;
}

/**
 * Passe-plat entre la vue « Cas non répertoriés » et le guide des pannes :
 * quand l'admin clique « Créer une panne à partir de ce cas », on stocke ici
 * le brouillon, puis on navigue vers l'onglet Guide qui ouvre le formulaire
 * pré-rempli et vide le brouillon.
 */
@Injectable({ providedIn: 'root' })
export class PanneDraftService {
  readonly draft = signal<PanneDraft | null>(null);

  set(d: PanneDraft): void {
    this.draft.set(d);
  }

  /** Récupère puis efface le brouillon (consommation unique). */
  consommer(): PanneDraft | null {
    const d = this.draft();
    this.draft.set(null);
    return d;
  }
}
