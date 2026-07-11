import { inject, Injectable, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { Demande } from '../../core/models/demande.model';

/**
 * Petit magasin partagé pour le compteur de demandes « nouveau » (badge de
 * navigation + tableau de bord). Rafraîchi par la page Demandes après chaque
 * action, et au chargement de l'espace admin.
 */
@Injectable({ providedIn: 'root' })
export class DemandesBadgeService {
  private api = inject(AdminApiService);

  /** Nombre de demandes au statut « nouveau ». */
  readonly nouvelles = signal(0);

  /** Recharge le compteur depuis l'API. */
  refresh(): void {
    this.api.list<Demande>('demandes').subscribe({
      next: (list) => this.nouvelles.set(list.filter((d) => (d.statut ?? 'nouveau') === 'nouveau').length),
      error: () => {},
    });
  }
}
