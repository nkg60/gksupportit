import { inject, Injectable, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { Demande, STATUTS_A_TRAITER } from '../../core/models/demande.model';

/**
 * Petit magasin partagé pour le compteur de demandes « nouveau » (badge de
 * navigation + tableau de bord). Rafraîchi par la page Demandes après chaque
 * action, et au chargement de l'espace admin.
 */
@Injectable({ providedIn: 'root' })
export class DemandesBadgeService {
  private api = inject(AdminApiService);

  /** Nombre de demandes « à traiter » (prospect + nouvelle-demande). */
  readonly nouvelles = signal(0);

  /** Recharge le compteur depuis l'API. */
  refresh(): void {
    this.api.list<Demande>('demandes').subscribe({
      next: (list) =>
        this.nouvelles.set(
          list.filter((d) => STATUTS_A_TRAITER.includes(d.statut ?? 'nouvelle-demande')).length,
        ),
      error: () => {},
    });
  }
}
