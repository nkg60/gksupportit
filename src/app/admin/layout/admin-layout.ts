import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LogoComponent } from '../../shared/logo/logo';

/**
 * Ossature de l'espace admin : barre latérale de navigation + contenu routé.
 * Toutes les routes enfant sont protégées par le guard admin.
 */
@Component({
  selector: 'gk-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LogoComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);

  /** Menu latéral ouvert (mobile). */
  readonly menuOuvert = signal(false);

  readonly liens = [
    { chemin: 'dashboard', libelle: 'Tableau de bord', icone: '📊' },
    { chemin: 'tresorerie', libelle: 'Trésorerie', icone: '💰' },
    { chemin: 'interventions', libelle: 'Interventions', icone: '🛠️' },
    { chemin: 'depannage', libelle: 'Dépannage', icone: '🩺' },
    { chemin: 'offres', libelle: 'Offres & affiches', icone: '🏷️' },
    { chemin: 'cartes', libelle: 'Cartes de visite', icone: '📇' },
    { chemin: 'parametres', libelle: 'Paramètres', icone: '⚙️' },
  ];

  basculer(): void {
    this.menuOuvert.update((v) => !v);
  }

  fermer(): void {
    this.menuOuvert.set(false);
  }

  deconnexion(): void {
    this.auth.logout();
  }
}
