import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { DemandesBadgeService } from '../services/demandes-badge.service';
import { PushNotificationsService } from '../services/push-notifications.service';
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
  private badge = inject(DemandesBadgeService);
  readonly push = inject(PushNotificationsService);

  /** Compteur de nouvelles demandes (badge de navigation). */
  readonly nouvellesDemandes = this.badge.nouvelles;
  /** Compteur de cas non répertoriés (badge de navigation). */
  readonly casInconnus = this.badge.casInconnus;

  /** Menu latéral ouvert (mobile). */
  readonly menuOuvert = signal(false);

  readonly liens = [
    { chemin: 'dashboard', libelle: 'Tableau de bord', icone: '📊' },
    { chemin: 'demandes', libelle: 'Demandes', icone: '📨' },
    { chemin: 'cas-inconnus', libelle: 'Cas inconnus', icone: '❓' },
    { chemin: 'tresorerie', libelle: 'Trésorerie', icone: '💰' },
    { chemin: 'interventions', libelle: 'Interventions', icone: '🛠️' },
    { chemin: 'depannage', libelle: 'Dépannage', icone: '🩺' },
    { chemin: 'offres', libelle: 'Offres & affiches', icone: '🏷️' },
    { chemin: 'cartes', libelle: 'Cartes de visite', icone: '📇' },
    { chemin: 'parametres', libelle: 'Paramètres', icone: '⚙️' },
  ];

  constructor() {
    // Charge le compteur de demandes dès l'entrée dans l'admin.
    this.badge.refresh();
  }

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
