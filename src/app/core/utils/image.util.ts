/**
 * Redimensionne une image côté navigateur (canvas) avant l'envoi, pour garder
 * des affiches légères et cohérentes (comme les posters optimisés du site).
 *
 * @param fichier Fichier image choisi par l'admin.
 * @param maxLargeur Largeur maximale (px). L'image est réduite si plus large.
 * @returns { dataBase64, contentType } prêts pour l'upload.
 */
export function redimensionnerImage(
  fichier: File,
  maxLargeur = 900,
): Promise<{ dataBase64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('Lecture du fichier impossible'));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const ratio = img.width > maxLargeur ? maxLargeur / img.width : 1;
        const largeur = Math.round(img.width * ratio);
        const hauteur = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, 0, 0, largeur, hauteur);

        // WebP si possible (plus léger), sinon JPEG.
        let contentType = 'image/webp';
        let url = canvas.toDataURL(contentType, 0.82);
        if (!url.startsWith('data:image/webp')) {
          contentType = 'image/jpeg';
          url = canvas.toDataURL(contentType, 0.85);
        }
        resolve({ dataBase64: url.split(',')[1] ?? '', contentType });
      };
      img.src = lecteur.result as string;
    };
    lecteur.readAsDataURL(fichier);
  });
}
