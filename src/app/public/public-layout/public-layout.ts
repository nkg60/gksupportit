import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header';
import { FooterComponent } from '../../shared/footer/footer';

/**
 * Mise en page du site PUBLIC : en-tête + contenu routé + pied de page.
 * L'espace admin utilise sa propre mise en page (sans cet en-tête/pied).
 */
@Component({
  selector: 'gk-public-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <gk-header />
    <main id="contenu" class="public-main">
      <router-outlet />
    </main>
    <gk-footer />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .public-main {
        flex: 1;
      }
    `,
  ],
})
export class PublicLayoutComponent {}
