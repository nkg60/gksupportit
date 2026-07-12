import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Sélecteur de langue FR / EN.
 * Bascule instantanée (Transloco recharge les libellés sans rechargement de page)
 * et mémorise le choix dans localStorage.
 */
@Component({
  selector: 'gk-lang-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang" role="group" aria-label="Langue / Language">
      @for (lang of langs; track lang) {
        <button
          type="button"
          class="lang__btn"
          [class.lang__btn--active]="active() === lang"
          [attr.aria-pressed]="active() === lang"
          (click)="set(lang)"
        >
          {{ lang.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .lang {
        display: inline-flex;
        border: 1px solid rgba(234, 241, 251, 0.4);
        border-radius: var(--gk-radius-pill);
        overflow: hidden;
      }
      .lang__btn {
        background: transparent;
        color: inherit;
        border: 0;
        padding: 0.3rem 0.7rem;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        font-family: inherit;
      }
      .lang__btn--active {
        background: var(--gk-amber);
        color: var(--gk-navy);
      }
    `,
  ],
})
export class LangSwitcherComponent {
  private transloco = inject(TranslocoService);
  readonly langs = ['fr', 'en'] as const;

  /** Langue active, réactive au changement. */
  readonly active = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  // La restauration de la langue mémorisée se fait au démarrage de l'application
  // (provideAppInitializer dans app.config.ts), pas dans ce constructeur : appeler
  // setActiveLang à l'instanciation du composant provoquait une boucle infinie
  // (émission de langue → reRenderOnLangChange → re-création du composant → …).

  set(lang: string): void {
    // Garde : ne rien émettre si la langue est déjà active (évite un re-render inutile).
    if (this.transloco.getActiveLang() === lang) return;
    this.transloco.setActiveLang(lang);
    localStorage.setItem('gk-lang', lang);
  }
}
