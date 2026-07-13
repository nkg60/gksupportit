import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import {
  ArbreDiagnostic,
  CausePossible,
  DiagnosticResolu,
  ResultatRegle,
  SymptomeDiagnostic,
} from '../models/diagnostic.model';

/** Valeur d'option signifiant « je ne sais pas » (uniforme dans l'arbre). */
const REPONSE_INCONNUE = 'inconnu';

/**
 * Moteur du « Diagnostic gratuit » public.
 *
 * Lecture de l'arbre de décision :
 *  1. « /api/diagnostic-public » — version éditable depuis l'admin (Blobs) ;
 *  2. repli sur l'actif statique « /diagnostic-public.json » (utile en
 *     `ng serve` seul, avant que l'API ne soit en place) ;
 *  3. repli ultime sur un arbre vide (le composant affiche alors un message).
 *
 * La résolution est une fonction pure : on n'expose jamais la clé « pannes »
 * (contenu technique) — seul l'arbre public transite par le navigateur.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  private http = inject(HttpClient);

  /** Charge l'arbre de décision public. */
  getArbre(): Observable<ArbreDiagnostic> {
    return this.http.get<ArbreDiagnostic>('/api/diagnostic-public').pipe(
      catchError(() => this.http.get<ArbreDiagnostic>('/diagnostic-public.json')),
      catchError(() => of<ArbreDiagnostic>({ version: 0, symptomes: [] })),
      map((arbre) => arbre ?? { version: 0, symptomes: [] }),
    );
  }

  /**
   * Résout le diagnostic à partir du symptôme choisi et des réponses.
   * Les règles sont évaluées dans l'ordre ; la première dont TOUTES les
   * conditions correspondent gagne. Sinon → résultat par défaut (prudent).
   * Une réponse « je ne sais pas » ne matche aucune règle spécifique et
   * retombe donc naturellement sur le résultat par défaut : elle ne bloque
   * jamais la progression, et le moteur produit toujours un résultat.
   */
  resoudre(
    symptome: SymptomeDiagnostic,
    reponses: Record<string, string>,
  ): DiagnosticResolu {
    const regleGagnante = symptome.regles.find((regle) =>
      Object.entries(regle.si).every(([questionId, valeur]) => reponses[questionId] === valeur),
    );
    const base: ResultatRegle = regleGagnante?.alors ?? symptome.resultatParDefaut;
    const champLibre = !!symptome.champLibre;

    // Toutes les questions répondues « je ne sais pas » (ou sans réponse) ?
    const toutesInconnues =
      symptome.questions.length > 0 &&
      symptome.questions.every((q) => !reponses[q.id] || reponses[q.id] === REPONSE_INCONNUE);

    // Cas 1 : aucune règle n'a tranché, et soit le défaut est marqué non
    // concluant, soit le visiteur n'a rien pu préciser.
    const inconclusif =
      !champLibre && !regleGagnante && (!!base.inconclusif || toutesInconnues);

    let resultat: ResultatRegle = base;
    let causes: CausePossible[] = [];
    if (inconclusif) {
      causes = this.causesPossibles(symptome);
      resultat = {
        ...base,
        serviceId: 'diagnostic',
        prixEstime: 'gratuit si vous acceptez la réparation (sinon 25 $)',
        explication:
          "D'après vos réponses, plusieurs causes sont possibles. Nous préférons être honnêtes : " +
          'nous ne pouvons pas trancher à distance sans risquer de nous tromper. Un diagnostic sur ' +
          'place identifie la cause exacte, sans engagement.',
      };
    }

    return {
      ...resultat,
      symptomeId: symptome.id,
      symptomeLibelle: symptome.libellePublic,
      inconclusif,
      champLibre,
      causes,
    };
  }

  /** Jusqu'à 3 causes possibles distinctes, dérivées des règles du symptôme. */
  private causesPossibles(symptome: SymptomeDiagnostic): CausePossible[] {
    const vues = new Set<string>();
    const causes: CausePossible[] = [];
    for (const r of symptome.regles) {
      const cle = `${r.alors.serviceId}|${r.alors.panneId ?? ''}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      causes.push({
        serviceId: r.alors.serviceId,
        gravite: r.alors.gravite,
        libelle: this.premierePhrase(r.alors.explication),
      });
      if (causes.length >= 3) break;
    }
    return causes;
  }

  /** Première phrase d'un texte (pour un libellé de cause court). */
  private premierePhrase(texte: string): string {
    const m = texte.match(/^[^.!?]*[.!?]/);
    return (m ? m[0] : texte).trim();
  }
}
