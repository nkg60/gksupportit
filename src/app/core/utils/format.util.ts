/** Formatage monétaire canadien-français : 472.9 -> « 472,90 $ ». */
const fmtMontant = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function formatMontant(n: number): string {
  return fmtMontant.format(Number.isFinite(n) ? n : 0);
}

/** Date ISO -> « AAAA-MM-JJ » pour l'affichage court. */
export function formatDateCourte(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}
