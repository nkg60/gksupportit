import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logo GK SupportIT.
 * Reproduit la charte : carré à coins arrondis, bordure ambre, initiales « GK »
 * en ambre, à côté du texte « GK SupportIT » (« SupportIT » en ambre).
 *
 * @Input variant  'light' (texte marine, pour fond clair) ou
 *                 'dark' (texte blanc, pour fond marine).
 */
@Component({
  selector: 'gk-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--dark]="variant() === 'dark'" aria-label="GK SupportIT">
      <span class="logo__badge" aria-hidden="true">GK</span>
      <span class="logo__word">
        <span class="logo__word-gk">GK</span><span class="logo__word-support">SupportIT</span>
      </span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .logo {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 800;
      }
      .logo__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: var(--gk-navy);
        border: 2px solid var(--gk-amber);
        color: var(--gk-amber);
        font-size: 1.15rem;
        font-weight: 900;
        letter-spacing: 0.02em;
        flex: 0 0 auto;
      }
      .logo__word {
        font-size: 1.3rem;
        line-height: 1;
        white-space: nowrap;
      }
      .logo__word-gk {
        color: var(--gk-navy);
      }
      .logo__word-support {
        color: var(--gk-amber);
      }
      /* Variante fond marine : « GK » passe en blanc pour rester lisible. */
      .logo--dark .logo__word-gk {
        color: var(--gk-white);
      }
    `,
  ],
})
export class LogoComponent {
  readonly variant = input<'light' | 'dark'>('light');
}
