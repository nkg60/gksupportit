/**
 * Construit un lien WhatsApp (wa.me) avec message pré-rempli.
 * Le numéro n'est jamais codé en dur : il provient toujours des paramètres
 * du site (settings.whatsappNumber), donc éditable depuis l'admin.
 *
 * @param numero  Numéro international, chiffres uniquement (ex. « 15149736569 »).
 * @param message Texte pré-rempli (sera encodé pour l'URL).
 */
export function lienWhatsApp(numero: string, message: string): string {
  const num = (numero || '').replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Message pré-rempli pour un service donné (bouton « Choisir ce service »). */
export function messageService(nomService: string): string {
  return `Bonjour GK SupportIT, je suis intéressé(e) par le service : ${nomService}`;
}
