import { Service } from '../models/service.model';

/**
 * Données initiales des 11 services de GK SupportIT.
 * Ces valeurs serviront à pré-remplir Netlify Blobs (Phase 2). En Phase 1,
 * ContentService les renvoie directement pour alimenter le site public.
 *
 * Remarque images : 3 services n'ont pas encore d'affiche dédiée
 * (Ajout RAM, Réseau/Wi-Fi, Sauvegarde entreprises) → image « default.webp »
 * (remplaçable plus tard via l'upload admin).
 */
export const SERVICES_SEED: Service[] = [
  {
    id: 'diagnostic',
    nom: 'Diagnostic complet',
    prixMarche: '50 $',
    prixGK: 'Gratuit si réparation (sinon 25 $)',
    description:
      "Votre ordinateur a un souci et vous ne savez pas quoi ? Nous venons voir ce qui ne va pas et nous vous l'expliquons simplement, sans mots compliqués. Vous saurez exactement quoi faire et combien ça coûte, avant de payer.",
    image: 'diag.webp',
    ordre: 1,
    actif: true,
  },
  {
    id: 'nettoyage-virus',
    nom: 'Nettoyage virus + optimisation',
    prixMarche: '100 $',
    prixGK: '75 $',
    description:
      "Votre ordinateur est lent, des fenêtres de pub s'ouvrent toutes seules, ou vous avez peur d'avoir attrapé un virus ? Nous le nettoyons à fond. Il redevient rapide, propre et sûr.",
    image: 'virus.webp',
    ordre: 2,
    actif: true,
  },
  {
    id: 'reinstallation-systeme',
    nom: 'Réinstallation du système (Windows ou Ubuntu/Linux)',
    prixMarche: '120 $',
    prixGK: '85 $',
    description:
      "Votre ordinateur plante sans arrêt ou met une éternité à démarrer ? Nous remettons votre système à neuf — Windows ou Linux (Ubuntu) — après avoir mis vos photos et documents en sécurité. C'est comme repartir avec un ordinateur neuf.",
    image: 'os.webp',
    ordre: 3,
    actif: true,
  },
  {
    id: 'migration-ssd',
    nom: 'Migration vers SSD',
    prixMarche: '130 $',
    prixGK: '100 $ + pièce au prix coûtant',
    description:
      "Votre ordinateur met plusieurs minutes à démarrer et rame pour tout ? Nous remplaçons le vieux disque par un disque moderne : il démarre en quelques secondes. C'est le changement qui impressionne le plus nos clients.",
    image: 'ssd.webp',
    ordre: 4,
    actif: true,
  },
  {
    id: 'nettoyage-interne',
    nom: 'Nettoyage interne + pâte thermique',
    prixMarche: '90 $',
    prixGK: '70 $',
    description:
      "Votre portable chauffe, le ventilateur fait du bruit, ou il s'éteint tout seul ? Nous l'ouvrons, le nettoyons et refaisons le nécessaire. Il redevient silencieux et frais.",
    image: 'cooling.webp',
    ordre: 5,
    actif: true,
  },
  {
    id: 'ajout-ram',
    nom: 'Ajout de mémoire (RAM)',
    prixMarche: '90 $',
    prixGK: '30 $ + pièce au prix coûtant',
    description:
      "Dès que vous ouvrez plusieurs choses en même temps, tout devient lent ? Nous ajoutons de la mémoire pour que votre ordinateur suive votre rythme sans ramer.",
    image: 'default.webp',
    ordre: 6,
    actif: true,
  },
  {
    id: 'installation-imprimante',
    nom: 'Installation imprimante',
    prixMarche: '100 $',
    prixGK: '70 $',
    description:
      "Votre imprimante refuse d'imprimer, affiche « hors ligne », ou vous n'arrivez pas à l'installer ? Nous nous en occupons et faisons en sorte que ça marche du premier coup.",
    image: 'imprimante.webp',
    ordre: 7,
    actif: true,
  },
  {
    id: 'reseau-wifi',
    nom: 'Configuration réseau / Wi-Fi',
    prixMarche: '100 $',
    prixGK: '70 $',
    description:
      "Le Wi-Fi ne capte pas bien, coupe tout le temps, ou est trop lent ? Nous réglons votre connexion pour qu'elle soit stable et rapide partout chez vous.",
    image: 'default.webp',
    ordre: 8,
    actif: true,
  },
  {
    id: 'recuperation-donnees',
    nom: 'Récupération de données',
    prixMarche: 'Sur devis',
    prixGK: 'Dès 75 $',
    description:
      "Vous avez supprimé des fichiers importants par erreur, ou votre clé USB ne s'ouvre plus ? Nous essayons de récupérer vos fichiers, et nous vous disons honnêtement dès le début ce qui est récupérable.",
    image: 'recup_data.webp',
    ordre: 9,
    actif: true,
  },
  {
    id: 'mise-a-niveau-systeme',
    nom: 'Installation & mise à niveau du système',
    prixMarche: '120 $',
    prixGK: '85 $',
    description:
      "Vous voulez passer à Windows 11, ou découvrir Linux (Ubuntu) pour redonner vie à un vieil ordinateur ? Nous vérifions, préparons tout et faisons l'installation sans perdre vos fichiers.",
    image: 'os.webp',
    ordre: 10,
    actif: true,
  },
  {
    id: 'sauvegarde-entreprises',
    nom: 'Sauvegarde & partage (entreprises)',
    prixMarche: 'Sur devis',
    prixGK: 'Dès 90 $',
    description:
      "Vous avez peur de perdre vos documents, ou vous voulez que plusieurs ordinateurs partagent les mêmes fichiers ? Nous mettons en place une sauvegarde automatique fiable. Vous ne perdez plus jamais rien.",
    image: 'default.webp',
    ordre: 11,
    actif: true,
  },
];
