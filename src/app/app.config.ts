import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { adminAuthInterceptor } from './admin/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Défilement en haut à chaque navigation + restauration ancre.
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([adminAuthInterceptor])),
    // Internationalisation FR (défaut) / EN, bascule à chaud.
    provideTransloco({
      config: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        fallbackLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Restaure une seule fois, au démarrage, la langue mémorisée dans localStorage.
    // Fait ici (hors composant) : à l'init aucune vue n'est encore rendue, donc
    // reRenderOnLangChange ne peut pas déclencher de boucle de re-création.
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      const saved = localStorage.getItem('gk-lang');
      if (
        saved &&
        transloco.getAvailableLangs().some((l) => (typeof l === 'string' ? l : l.id) === saved) &&
        transloco.getActiveLang() !== saved
      ) {
        transloco.setActiveLang(saved);
      }
    }),
  ],
};
