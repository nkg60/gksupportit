---
name: verify
description: Vérifier un changement de GK SupportIT en conditions réelles (netlify dev + Playwright).
---

# Vérifier l'application GK SupportIT

## Lancer la pile complète (Angular + fonctions + Blobs locaux)

```bash
npx netlify dev --port 8899 --command "npm start -- --port 4299" --target-port 4299
```

- Le CLI `netlify` est dans `node_modules/.bin` (pas global).
- ⚠️ Un processus zombie peut tenir le port 4200 (connexions réinitialisées,
  invisible pour `fuser`) : toujours passer par des ports alternatifs comme
  ci-dessus.
- Prêt quand `curl http://localhost:8899/api/diagnostic-public` répond 200
  (compter ~30-60 s pour ng serve).
- Les Blobs locaux (demandes, images…) vivent dans `.netlify/blobs-serve/` —
  nettoyer les données de test après vérification (DELETE via l'API admin,
  `rm` pour les images `site:gk-images/`).

## Piloter le navigateur

Pas de Playwright complet, mais `playwright-core` est dans node_modules et un
Chromium est en cache :

```js
import { chromium } from '<repo>/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
});
```

## Pièges connus

- **Admin** : le jeton JWT est en mémoire uniquement (pas de localStorage).
  Après login sur `/admin/login` (mot de passe = `ADMIN_PASSWORD` du `.env`),
  naviguer via les liens du SPA — un `page.goto()` recharge et déconnecte.
- **API admin** : `POST /api/admin/login {password}` → `{token}` ; données via
  `GET/DELETE /api/admin/data/:store[/:id]` avec `Authorization: Bearer`.
- Toujours `waitForSelector` avant `locator(...).all()` (sinon liste vide et
  clics silencieusement absents).
- Le parcours diagnostic public : `/diagnostic` → Commencer → carte symptôme
  (`.diag__carte`) → options (`.diag__option`) → Continuer → « Voir mon
  résultat sans laisser mes coordonnées » ou formulaire + consentement.
