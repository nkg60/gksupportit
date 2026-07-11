import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { ExportService } from '../services/export.service';
import { ContentService } from '../../core/services/content.service';
import {
  Intervention,
  PAIEMENTS,
  STATUTS_INTERVENTION,
} from '../../core/models/intervention.model';
import { formatMontant, formatDateCourte } from '../../core/utils/format.util';

/**
 * Registre des interventions clients.
 * La marge (prix facturé − coût pièces) est calculée automatiquement, et une
 * intervention « Terminé » crée automatiquement une entrée « Revenu client »
 * en trésorerie (géré côté serveur).
 */
@Component({
  selector: 'gk-admin-interventions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './interventions.html',
  styleUrl: './interventions.scss',
})
export class InterventionsComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);
  private exporter = inject(ExportService);
  private content = inject(ContentService);

  readonly paiements = PAIEMENTS;
  readonly statuts = STATUTS_INTERVENTION;
  /** Noms de services (suggestions pour le champ « service réalisé »). */
  readonly services = toSignal(this.content.getServices(), { initialValue: [] });

  readonly interventions = signal<Intervention[]>([]);
  readonly chargement = signal(true);
  readonly editionId = signal<string | null>(null);

  readonly fmt = formatMontant;
  readonly fmtDate = formatDateCourte;

  readonly form = this.fb.nonNullable.group({
    date: [this.aujourdhui(), [Validators.required]],
    client: ['', [Validators.required]],
    telephone: [''],
    appareil: [''],
    probleme: [''],
    service: [''],
    coutPieces: [0, [Validators.min(0)]],
    prixFacture: [0, [Validators.min(0)]],
    paiement: ['Interac'],
    statut: ['À planifier'],
    avisDemande: [false],
    notes: [''],
  });

  constructor() {
    this.charger();
  }

  /** Interventions triées par date décroissante. */
  readonly lignes = computed(() =>
    [...this.interventions()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  );

  /** Aperçu de la marge pendant la saisie. */
  readonly margeApercu = computed(() => {
    const v = this.form.getRawValue();
    return (Number(v.prixFacture) || 0) - (Number(v.coutPieces) || 0);
  });

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Intervention>('interventions').subscribe({
      next: (data) => {
        this.interventions.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveau(): void {
    this.form.reset({
      date: this.aujourdhui(),
      client: '',
      telephone: '',
      appareil: '',
      probleme: '',
      service: '',
      coutPieces: 0,
      prixFacture: 0,
      paiement: 'Interac',
      statut: 'À planifier',
      avisDemande: false,
      notes: '',
    });
    this.editionId.set('');
  }

  ouvrirEdition(i: Intervention): void {
    this.form.reset({
      date: this.fmtDate(i.date),
      client: i.client,
      telephone: i.telephone ?? '',
      appareil: i.appareil ?? '',
      probleme: i.probleme ?? '',
      service: i.service ?? '',
      coutPieces: i.coutPieces ?? 0,
      prixFacture: i.prixFacture ?? 0,
      paiement: i.paiement ?? 'Interac',
      statut: i.statut ?? 'À planifier',
      avisDemande: !!i.avisDemande,
      notes: i.notes ?? '',
    });
    this.editionId.set(i.id ?? '');
  }

  fermer(): void {
    this.editionId.set(null);
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const id = this.editionId();
    const req = id
      ? this.api.update<Intervention>('interventions', id, valeur)
      : this.api.create<Intervention>('interventions', valeur);
    req.subscribe(() => {
      this.fermer();
      this.charger();
    });
  }

  supprimer(i: Intervention): void {
    if (!i.id) return;
    if (!confirm(`Supprimer l'intervention de « ${i.client} » ?\n(La ligne de trésorerie liée sera aussi retirée.)`))
      return;
    this.api.remove('interventions', i.id).subscribe(() => this.charger());
  }

  // --- Export ---
  exportXlsx(): void {
    this.exporter.exporterXlsx(
      [{ nom: 'Interventions', lignes: this.lignesExport() }],
      'GK-interventions',
    );
  }
  exportCsv(): void {
    this.exporter.exporterCsv(this.lignesExport(), 'GK-interventions');
  }
  private lignesExport(): Record<string, unknown>[] {
    return this.lignes().map((i) => ({
      Date: this.fmtDate(i.date),
      Client: i.client,
      Téléphone: i.telephone,
      Appareil: i.appareil,
      Problème: i.probleme,
      Service: i.service,
      'Coût pièces': i.coutPieces,
      'Prix facturé': i.prixFacture,
      Marge: i.marge,
      Paiement: i.paiement,
      Statut: i.statut,
      'Avis demandé': i.avisDemande ? 'oui' : 'non',
      Notes: i.notes,
    }));
  }

  private aujourdhui(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
