import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { Mouvement } from '../../core/models/mouvement.model';
import { Intervention } from '../../core/models/intervention.model';
import { formatMontant } from '../../core/utils/format.util';

/**
 * Tableau de bord : indicateurs calculés automatiquement à partir de la
 * trésorerie, des interventions et du capital de départ (logique de l'Excel).
 */
@Component({
  selector: 'gk-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private api = inject(AdminApiService);

  readonly settings = toSignal(this.api.getSettings());
  readonly mouvements = toSignal(this.api.list<Mouvement>('tresorerie'), { initialValue: [] });
  readonly interventions = toSignal(this.api.list<Intervention>('interventions'), {
    initialValue: [],
  });

  private somme(filtre: (m: Mouvement) => boolean): number {
    return this.mouvements()
      .filter(filtre)
      .reduce((t, m) => t + (Number(m.montant) || 0), 0);
  }

  /** Capital de départ (paramètre). */
  readonly capitalDepart = computed(() => this.settings()?.capitalDepart ?? 0);
  /** Total encaissé = toutes les entrées SAUF l'apport de capital. */
  readonly totalEncaisse = computed(() =>
    this.somme((m) => m.type === 'Entrée' && m.categorie !== 'Capital'),
  );
  /** Total dépensé = toutes les sorties. */
  readonly totalDepense = computed(() => this.somme((m) => m.type === 'Sortie'));
  /** Solde de trésorerie = entrées − sorties (capital inclus). */
  readonly solde = computed(
    () => this.somme((m) => m.type === 'Entrée') - this.somme((m) => m.type === 'Sortie'),
  );
  /** Bénéfice net (hors capital). */
  readonly benefice = computed(() => this.totalEncaisse() - this.totalDepense());
  /** Nombre d'interventions saisies. */
  readonly nbInterventions = computed(() => this.interventions().length);
  /** Revenu moyen par intervention. */
  readonly revenuMoyen = computed(() =>
    this.nbInterventions() > 0 ? this.totalEncaisse() / this.nbInterventions() : 0,
  );
  /** Clients servis (interventions terminées) — pour l'alerte 5e client. */
  readonly clientsServis = computed(
    () => this.interventions().filter((i) => i.statut === 'Terminé').length,
  );
  readonly seuilAtteint = computed(() => this.clientsServis() >= 5);

  readonly fmt = formatMontant;
}
