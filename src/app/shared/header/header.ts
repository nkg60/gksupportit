import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LogoComponent } from '../logo/logo';
import { LangSwitcherComponent } from '../lang-switcher/lang-switcher';

/**
 * En-tête du site public : bande marine avec logo, navigation principale,
 * sélecteur de langue et menu déroulant sur mobile.
 */
@Component({
  selector: 'gk-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, TranslocoDirective, LogoComponent, LangSwitcherComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  /** État d'ouverture du menu mobile. */
  readonly menuOuvert = signal(false);

  basculerMenu(): void {
    this.menuOuvert.update((v) => !v);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }
}
