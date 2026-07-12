import { ArbreDiagnostic, SymptomeDiagnostic } from '../models/diagnostic.model';
import { Panne } from '../models/panne.model';

/**
 * Liaison entre les pannes (contenu technique admin) et l'arbre du diagnostic
 * public. Une panne est « détectable côté client » dès qu'un symptôme du
 * diagnostic la référence via `panneId` (dans une règle ou le résultat par
 * défaut). Un symptôme en brouillon n'est pas encore public.
 */

/** Ids de pannes référencés par un symptôme (règles + résultat par défaut). */
export function pannesDuSymptome(s: SymptomeDiagnostic): string[] {
  const resultats = [s.resultatParDefaut, ...s.regles.map((r) => r.alors)];
  return resultats.map((r) => r.panneId).filter((id): id is string => !!id);
}

/** Ensembles des pannes référencées, séparées visibles / brouillons. */
export function pannesReferencees(arbre: ArbreDiagnostic): {
  visibles: Set<string>;
  brouillons: Set<string>;
} {
  const visibles = new Set<string>();
  const brouillons = new Set<string>();
  for (const s of arbre.symptomes) {
    for (const id of pannesDuSymptome(s)) {
      (s.brouillon ? brouillons : visibles).add(id);
    }
  }
  return { visibles, brouillons };
}

/** Statut d'une panne vis-à-vis du diagnostic client. */
export function statutPanne(
  arbre: ArbreDiagnostic,
  panneId: string | undefined,
): 'visible' | 'brouillon' | 'aucun' {
  if (!panneId) return 'aucun';
  const { visibles, brouillons } = pannesReferencees(arbre);
  if (visibles.has(panneId)) return 'visible';
  if (brouillons.has(panneId)) return 'brouillon';
  return 'aucun';
}

/** Pannes sans aucun équivalent (ni visible ni brouillon) dans le diagnostic. */
export function pannesSansEquivalent(pannes: Panne[], arbre: ArbreDiagnostic): Panne[] {
  const { visibles, brouillons } = pannesReferencees(arbre);
  return pannes.filter((p) => !!p.id && !visibles.has(p.id) && !brouillons.has(p.id));
}

/** Symptômes référençant une panne inexistante (panne supprimée) → orphelins. */
export function entreesOrphelines(arbre: ArbreDiagnostic, pannes: Panne[]): SymptomeDiagnostic[] {
  const ids = new Set(pannes.map((p) => p.id).filter(Boolean));
  return arbre.symptomes.filter((s) => {
    const refs = pannesDuSymptome(s);
    return refs.length > 0 && refs.some((id) => !ids.has(id));
  });
}
