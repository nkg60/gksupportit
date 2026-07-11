import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { LogoComponent } from '../logo/logo';

/**
 * Pied de page : rappel de marque, navigation, coordonnées (issues des
 * paramètres), mention bilingue et lien discret vers la connexion admin.
 */
@Component({
  selector: 'gk-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, LogoComponent],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  private content = inject(ContentService);

  /** Paramètres du site (coordonnées). */
  readonly settings = toSignal(this.content.getSettings());

  /** Année courante pour la mention de droits. */
  readonly annee = new Date().getFullYear();
}
