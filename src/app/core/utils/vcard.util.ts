import { Carte } from '../models/carte.model';

/**
 * Construit le contenu d'un fichier vCard (.vcf) à partir d'une carte,
 * pour le bouton « Ajouter à mes contacts ».
 *
 * @param carte La carte de visite.
 * @param urlSite Lien vers le site (pour le champ URL).
 */
export function construireVCard(carte: Carte, urlSite: string): string {
  // Séparation nom / prénom (best effort).
  const morceaux = carte.nom.trim().split(/\s+/);
  const prenom = morceaux.shift() ?? '';
  const nomFamille = morceaux.join(' ');
  const tel = carte.telephone || (carte.whatsapp ? `+${carte.whatsapp}` : '');

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${nomFamille};${prenom};;;`,
    `FN:${carte.nom}`,
    'ORG:GK SupportIT',
    `TITLE:${carte.role}`,
    tel ? `TEL;TYPE=CELL:${tel}` : '',
    carte.email ? `EMAIL;TYPE=INTERNET:${carte.email}` : '',
    urlSite ? `URL:${urlSite}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Déclenche le téléchargement d'un fichier vCard. */
export function telechargerVCard(carte: Carte, urlSite: string): void {
  const contenu = construireVCard(carte, urlSite);
  const blob = new Blob([contenu], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${carte.slug || 'contact'}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}
