import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import {
  ArbreDiagnostic,
  DiagnosticResolu,
  ResultatRegle,
  SymptomeDiagnostic,
} from '../models/diagnostic.model';

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
    const resultat: ResultatRegle = regleGagnante?.alors ?? symptome.resultatParDefaut;
    return {
      ...resultat,
      symptomeId: symptome.id,
      symptomeLibelle: symptome.libellePublic,
    };
  }
}
