/**
 * Contenu de référence du guide de diagnostic (aide-mémoire outils, réflexes de
 * sécurité, et « Ce que je ne fais pas »). Extrait fidèlement du guide terrain.
 * Consultable en lecture rapide pendant une intervention.
 */

/** Aide-mémoire : quel outil pour quel symptôme. */
export interface OutilSymptome {
  question: string;
  outil: string;
  ou: string;
}

export const OUTILS_PAR_SYMPTOME: OutilSymptome[] = [
  { question: 'Le disque est-il en train de mourir ?', outil: 'CrystalDiskInfo', ou: 'Clé 2 · verdict « Bon / Prudence / Mauvais » en 10 s' },
  { question: 'La RAM est-elle défectueuse ?', outil: 'MemTest86', ou: 'Clé 1 (Ventoy) · démarrer dessus, 1 passe mini' },
  { question: 'Températures / surchauffe ?', outil: 'HWMonitor', ou: 'Clé 2 · CPU/GPU au repos et en charge' },
  { question: "Récupérer les fichiers d'un PC mort", outil: 'Ubuntu (live USB)', ou: "Clé 1 · « Essayer Ubuntu » sans installer" },
  { question: 'Réinitialiser un mot de passe Windows', outil: "Hiren's BootCD PE", ou: 'Clé 1 · outils de compte inclus' },
  { question: "Cloner l'ancien disque vers le SSD", outil: 'Macrium Reflect / Clonezilla', ou: 'Clé 2 · + boîtier/adaptateur SATA' },
  { question: 'Nettoyer virus et malwares', outil: 'Malwarebytes', ou: 'Clé 2 · scan complet en mode sans échec' },
  { question: "Qu'est-ce qui remplit le disque ?", outil: 'WinDirStat', ou: "Clé 2 · carte visuelle de l'espace" },
  { question: 'Récupérer des fichiers supprimés', outil: 'Recuva / PhotoRec', ou: 'Clé 2 · ne rien écrire sur le disque avant' },
  { question: 'État réel de la batterie', outil: 'powercfg /batteryreport', ou: 'Invite de commandes Windows' },
  { question: 'Compatibilité Windows 11 ?', outil: 'PC Health Check', ou: 'Windows · vérifie TPM / Secure Boot / CPU' },
  { question: 'Réparer un Windows corrompu', outil: 'sfc /scannow · DISM · chkdsk · WinRE', ou: 'Invite admin / environnement de récupération' },
  { question: 'Voir les erreurs récurrentes du système', outil: "Observateur d'événements", ou: 'Windows · journaux Système et Application' },
];

/** Réflexes de sécurité (à ne jamais oublier). */
export const REFLEXES_SECURITE: { titre: string; detail: string }[] = [
  { titre: "Données d'abord.", detail: 'Avant tout formatage, clonage ou réinstallation : sauvegarde les fichiers du client via la clé Ubuntu, et fais confirmer par texto.' },
  { titre: 'En cas de fichiers perdus : ne plus rien écrire', detail: 'sur le disque concerné — chaque écriture réduit les chances de récupération.' },
  { titre: 'Décharge électrostatique.', detail: 'Porte ton bracelet antistatique avant de toucher RAM, SSD ou carte mère.' },
  { titre: 'Photo avant intervention.', detail: "Photographie l'appareil allumé (état, écran) à la prise en charge." },
  { titre: 'Une hypothèse à la fois.', detail: 'Ne change jamais deux choses en même temps.' },
  { titre: 'Propriété légitime.', detail: "Pour tout déblocage de session/mot de passe, assure-toi que le client est bien le propriétaire de la machine." },
];

/** Ce que je ne fais pas (au départ). */
export const CE_QUE_JE_NE_FAIS_PAS: string[] = [
  'Microsoudure et réparation de carte mère — matériel coûteux, risque élevé. Oriente vers un atelier spécialisé.',
  'Récupération sur disque physiquement mort (cliquetis, non détecté partout) — nécessite un labo en salle blanche.',
  "Réparation d'écran de téléphone / tablette — hors périmètre actuel (ordinateurs uniquement).",
  "Savoir dire « ça, je ne le fais pas » renforce ta crédibilité : le client comprend que tu es sérieux et que tu ne risqueras pas sa machine.",
];
