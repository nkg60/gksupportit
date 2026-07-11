# GK SupportIT

Site web professionnel de **GK SupportIT** — service de réparation informatique à
domicile à Ottawa (bilingue FR/EN). Le site sert à la fois de **vitrine publique**
et d'**outil de gestion interne** (tableau de bord, trésorerie, interventions,
dépannage guidé, cartes de visite numériques).

> Slogan : « Réparation informatique à domicile — Déplacement inclus partout à Ottawa. »

---

## Sommaire

- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Lancer en local](#lancer-en-local)
- [Structure du projet](#structure-du-projet)
- [Données et stockage](#données-et-stockage)
- [Espace administrateur](#espace-administrateur)
- [Déploiement sur Netlify (pas à pas)](#déploiement-sur-netlify-pas-à-pas)
- [Mettre à jour le site](#mettre-à-jour-le-site)
- [Sécurité](#sécurité)

---

## Stack technique

| Élément | Choix |
|---|---|
| Frontend | **Angular 22** (standalone, TypeScript strict, Router + lazy loading, zoneless) |
| i18n | **Transloco** (FR par défaut, EN — bascule à chaud) |
| Style | **SCSS + design tokens** (variables CSS de marque, aucun framework CSS lourd) |
| Backend | **Netlify Functions** (serverless, TypeScript, `.mts`) |
| Persistance | **Netlify Blobs** (stockage clé-valeur JSON + images) |
| Auth admin | Mot de passe (variable d'env) → **JWT signé** (jose, HS256) |
| Export | **SheetJS (xlsx)** — export Excel/CSV |
| QR codes | **qrcode** (génération côté client) |
| Hébergement | **Netlify** · code source sur **GitHub** |

Tout tient dans les offres **gratuites** de Netlify et GitHub.

---

## Prérequis

- **Node.js 22** (ou ≥ 20.19). Vérifier : `node --version`.
- **npm** (fourni avec Node).
- **Netlify CLI** (déjà en dépendance de dev) pour le développement local avec
  les fonctions et Blobs : utilisée via `npx netlify …`.

---

## Installation locale

```bash
git clone https://github.com/<votre-compte>/gksupportit.git
cd gksupportit
npm install
```

---

## Variables d'environnement

Copiez `.env.example` en `.env` (le fichier `.env` est ignoré par Git) :

```bash
cp .env.example .env
```

Renseignez ensuite :

| Variable | Rôle |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe de connexion à l'espace admin. |
| `JWT_SECRET` | Secret de signature des jetons de session. |

Générer un `JWT_SECRET` solide :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Netlify Blobs ne nécessite **aucune** variable : le stockage est fourni
> automatiquement par le runtime Netlify (en local via `netlify dev` comme en
> production).

---

## Lancer en local

**Option 1 — Expérience complète (recommandée)** : Angular + fonctions + Blobs.

```bash
npx netlify dev
# Ouvre http://localhost:8888
```

**Option 2 — Front seul** (sans backend ; les données retombent sur les seeds) :

```bash
npm start
# Ouvre http://localhost:4200
```

Autres commandes :

```bash
npm run build     # build de production -> dist/gk-supportit/browser
```

---

## Structure du projet

```
gksupportit/
├─ netlify.toml                 # build, fonctions, redirections, Node 22
├─ .env.example                 # documentation des variables d'env
├─ netlify/functions/           # backend serverless
│  ├─ _lib/                     # helpers Blobs, auth JWT, guard
│  ├─ _data/                    # seeds JSON (services, settings, pannes, …)
│  ├─ services.mts              # GET /api/services (public)
│  ├─ settings.mts              # GET /api/settings (public)
│  ├─ carte.mts                 # GET /api/carte/:slug (public)
│  ├─ image.mts                 # GET /api/image/:key (public)
│  ├─ demande.mts               # POST /api/demande (public)
│  ├─ login.mts                 # POST /api/admin/login
│  ├─ admin.mts                 # CRUD admin protégé (/api/admin/data/:store)
│  └─ upload-image.mts          # POST /api/admin/upload (protégé)
├─ public/                      # assets servis tels quels
│  ├─ i18n/{fr,en}.json         # libellés de traduction
│  └─ assets/                   # logo, bannière, affiches (WebP)
└─ src/app/
   ├─ core/                     # modèles, services, utils, seeds, i18n
   ├─ shared/                   # composants réutilisables (logo, header, …)
   ├─ public/                   # pages publiques + page carte
   └─ admin/                    # espace admin (auth, dashboard, …)
```

---

## Données et stockage

Toutes les données vivent dans **Netlify Blobs** (store `gk-data`, une clé JSON
par type ; les images dans le store `gk-images`) :

`settings · services · interventions · tresorerie · demandes · pannes · sessions · cartes`

Au **premier accès**, chaque clé est initialisée automatiquement depuis les
**seeds** (`netlify/functions/_data/*.json`) : 11 services, les 25 pannes du guide,
la trésorerie de départ (capital 500 $), les paramètres et une carte de visite.
Ensuite, Blobs fait foi et tout est éditable depuis l'admin.

---

## Espace administrateur

- URL : **`/admin`** (lien discret aussi en pied de page).
- Connexion avec le mot de passe `ADMIN_PASSWORD`.
- Le jeton de session est gardé **en mémoire** (pas de `localStorage`) : rafraîchir
  la page (F5) demande une reconnexion — c'est volontaire (sécurité).

Modules : Tableau de bord · Trésorerie · Interventions · Dépannage guidé ·
Offres & affiches · Cartes de visite · Paramètres.

---

## Déploiement sur Netlify (pas à pas)

### 1. Pousser le code sur GitHub

Le dépôt Git est déjà initialisé avec un premier commit. Créez un dépôt vide
nommé **`gksupportit`** sur GitHub (sans README), puis :

```bash
git remote add origin https://github.com/<votre-compte>/gksupportit.git
git branch -M main
git push -u origin main
```

### 2. Connecter le dépôt à Netlify

1. Sur [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Choisir **GitHub** puis le dépôt `gksupportit`.
3. Netlify lit `netlify.toml` automatiquement :
   - Build command : `npm run build`
   - Publish directory : `dist/gk-supportit/browser`
   - Functions directory : `netlify/functions`
   - Node : 22
4. Cliquer **Deploy**.

### 3. Configurer les variables d'environnement

Dans **Site configuration → Environment variables**, ajouter :

| Clé | Valeur |
|---|---|
| `ADMIN_PASSWORD` | votre mot de passe admin (fort) |
| `JWT_SECRET` | une longue chaîne aléatoire (voir plus haut) |

Puis **redéployer** (Deploys → Trigger deploy → Deploy site) pour que les
variables soient prises en compte.

### 4. Activer Netlify Blobs

Netlify Blobs est **activé automatiquement** pour les sites récents — aucune
action en général. Si un appel échoue avec une erreur de configuration Blobs,
vérifier dans **Site configuration → Blobs** que le stockage est actif.

### 5. Vérifications

- Site public : page d'accueil, services, formulaire « Décrire mon problème ».
- Carte de visite : `/carte/ghislain`.
- Admin : `/admin` → connexion avec `ADMIN_PASSWORD`.

---

## Mettre à jour le site

Le déploiement est **automatique** : chaque `git push` sur la branche `main`
déclenche un nouveau build et une mise en ligne par Netlify.

```bash
git add .
git commit -m "Description de la modification"
git push
```

Le contenu (services, prix, affiches, paramètres, pannes, cartes) se modifie
**sans toucher au code**, directement depuis l'espace admin.

---

## Sécurité

- Ne **jamais** committer le fichier `.env` (déjà ignoré par Git).
- Choisir un `ADMIN_PASSWORD` fort et un `JWT_SECRET` long et aléatoire.
- Le jeton de session admin est en mémoire uniquement (limite le vol par XSS).
- Toutes les fonctions d'écriture exigent un JWT admin valide ; les lectures
  publiques sont limitées aux données destinées au public (le capital de départ,
  par exemple, n'est jamais exposé).
