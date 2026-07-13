import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { DemandesBadgeService } from '../services/demandes-badge.service';
import { Mouvement } from '../../core/models/mouvement.model';
import { Intervention } from '../../core/models/intervention.model';
import { Demande } from '../../core/models/demande.model';
import { Panne } from '../../core/models/panne.model';
import { ArbreDiagnostic } from '../../core/models/diagnostic.model';
import { entreesOrphelines, pannesSansEquivalent } from '../../core/utils/diagnostic-link.util';
import { formatMontant } from '../../core/utils/format.util';

/**
 * Tableau de bord : indicateurs calculés automatiquement à partir de la
 * trésorerie, des interventions et du capital de départ (logique de l'Excel).
 */
@Component({
  selector: 'gk-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private api = inject(AdminApiService);
  private badge = inject(DemandesBadgeService);

  /** Nombre de nouvelles demandes (prospects non traités). */
  readonly nouvellesDemandes = this.badge.nouvelles;

  constructor() {
    this.badge.refresh();
  }

  readonly settings = toSignal(this.api.getSettings());
  readonly mouvements = toSignal(this.api.list<Mouvement>('tresorerie'), { initialValue: [] });
  readonly interventions = toSignal(this.api.list<Intervention>('interventions'), {
    initialValue: [],
  });
  readonly demandes = toSignal(this.api.list<Demande>('demandes'), { initialValue: [] });
  readonly pannes = toSignal(this.api.list<Panne>('pannes'), { initialValue: [] });
  readonly arbre = toSignal(this.api.getObject<ArbreDiagnostic>('diagnostic-public'), {
    initialValue: { version: 1, symptomes: [] } as ArbreDiagnostic,
  });

  /** Pannes sans équivalent dans le diagnostic client. */
  readonly pannesSansDiag = computed(() => pannesSansEquivalent(this.pannes(), this.arbre()).length);
  /** Entrées publiques orphelines (panne référencée supprimée). */
  readonly diagOrphelins = computed(() => entreesOrphelines(this.arbre(), this.pannes()).length);

  /** Cas non répertoriés (diagnostics non concluants / « Autre »). */
  private readonly casInconnus = computed(() =>
    this.demandes().filter((d) => d.casInconnu || d.statut === 'cas-inconnu'),
  );
  readonly nbCasInconnus = computed(() => this.casInconnus().length);
  /** Taux de cas non concluants sur l'ensemble des diagnostics en ligne. */
  readonly tauxCasInconnus = computed(() => {
    const diag = this.demandes().filter((d) => d.source === 'diagnostic-en-ligne').length;
    return diag ? Math.round((this.nbCasInconnus() / diag) * 100) : 0;
  });
  /** Mots les plus fréquents dans les descriptions des cas non répertoriés. */
  readonly motsFrequents = computed(() => this.analyserMots());
  /** Mots revenant dans au moins 3 cas → suggestion d'ajout au guide. */
  readonly recurrents = computed(() => this.motsFrequents().filter((m) => m.n >= 3));

  private readonly stopwords = new Set([
    'avec', 'pour', 'dans', 'mon', 'ordinateur', 'ordi', 'plus', 'pas', 'que', 'qui', 'les', 'des',
    'une', 'sur', 'est', 'sont', 'tout', 'tous', 'mais', 'quand', 'depuis', 'quoi', 'cela', 'cette',
    'mes', 'nous', 'vous', 'aux', 'par', 'ne', 'se', 'ça', 'fait', 'faire', 'très', 'bien', 'aussi',
    'pc', 'portable', 'écran', 'ecran',
  ]);

  /** Compte les mots significatifs (une fois par cas). */
  private analyserMots(): { mot: string; n: number }[] {
    const compte = new Map<string, number>();
    for (const d of this.casInconnus()) {
      const txt = (d.descriptionLibre || d.symptomeChoisi || '').toLowerCase();
      const mots = new Set(
        txt
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9 ]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !this.stopwords.has(w)),
      );
      for (const m of mots) compte.set(m, (compte.get(m) ?? 0) + 1);
    }
    return [...compte.entries()]
      .map(([mot, n]) => ({ mot, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }

  /** Diagnostics en ligne enregistrés (avec coordonnées + consentement). */
  readonly diagnosticsEffectues = computed(
    () => this.demandes().filter((d) => d.source === 'diagnostic-en-ligne').length,
  );
  /** Taux de conversion des diagnostics en interventions (statut « converti »). */
  readonly tauxConversion = computed(() => {
    const diag = this.demandes().filter((d) => d.source === 'diagnostic-en-ligne');
    if (diag.length === 0) return 0;
    const convertis = diag.filter((d) => d.statut === 'converti').length;
    return Math.round((convertis / diag.length) * 100);
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
