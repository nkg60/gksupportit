import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { ExportService } from '../services/export.service';
import { CATEGORIES_TRESORERIE, Mouvement } from '../../core/models/mouvement.model';
import { formatMontant, formatDateCourte } from '../../core/utils/format.util';

/** Mouvement enrichi du solde courant (pour l'affichage). */
interface LigneTresorerie extends Mouvement {
  solde: number;
}

/**
 * Journal de trésorerie : liste des mouvements avec solde courant,
 * ajout / édition / suppression, et export Excel/CSV.
 * Les entrées générées automatiquement (interventions payées) sont en lecture
 * seule ici : elles se gèrent depuis le registre des interventions.
 */
@Component({
  selector: 'gk-admin-tresorerie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './tresorerie.html',
  styleUrl: './tresorerie.scss',
})
export class TresorerieComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);
  private exporter = inject(ExportService);

  readonly categories = CATEGORIES_TRESORERIE;
  readonly mouvements = signal<Mouvement[]>([]);
  readonly chargement = signal(true);

  /** Modale d'édition ouverte (id en cours, '' = nouveau, null = fermée). */
  readonly editionId = signal<string | null>(null);

  readonly fmt = formatMontant;
  readonly fmtDate = formatDateCourte;

  readonly form = this.fb.nonNullable.group({
    date: [this.aujourdhui(), [Validators.required]],
    type: ['Sortie' as 'Entrée' | 'Sortie', [Validators.required]],
    montant: [0, [Validators.required, Validators.min(0.01)]],
    categorie: ['Matériel', [Validators.required]],
    description: ['', [Validators.required]],
  });

  constructor() {
    this.charger();
  }

  /** Lignes triées par date croissante avec solde courant cumulé. */
  readonly lignes = computed<LigneTresorerie[]>(() => {
    const tri = [...this.mouvements()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let solde = 0;
    return tri.map((m) => {
      solde += m.type === 'Entrée' ? Number(m.montant) || 0 : -(Number(m.montant) || 0);
      return { ...m, solde };
    });
  });

  /** Solde final (dernier cumul). */
  readonly soldeFinal = computed(() => {
    const l = this.lignes();
    return l.length ? l[l.length - 1].solde : 0;
  });

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Mouvement>('tresorerie').subscribe({
      next: (data) => {
        this.mouvements.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveau(): void {
    this.form.reset({
      date: this.aujourdhui(),
      type: 'Sortie',
      montant: 0,
      categorie: 'Matériel',
      description: '',
    });
    this.editionId.set('');
  }

  ouvrirEdition(m: Mouvement): void {
    if (m.auto) return; // entrées automatiques non modifiables ici
    this.form.reset({
      date: this.fmtDate(m.date),
      type: m.type,
      montant: m.montant,
      categorie: m.categorie,
      description: m.description,
    });
    this.editionId.set(m.id ?? '');
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
    const req =
      id
        ? this.api.update<Mouvement>('tresorerie', id, valeur)
        : this.api.create<Mouvement>('tresorerie', valeur);
    req.subscribe(() => {
      this.fermer();
      this.charger();
    });
  }

  supprimer(m: Mouvement): void {
    if (m.auto || !m.id) return;
    if (!confirm(`Supprimer ce mouvement ?\n${m.description} — ${this.fmt(m.montant)}`)) return;
    this.api.remove('tresorerie', m.id).subscribe(() => this.charger());
  }

  // --- Export ---
  exportXlsx(): void {
    this.exporter.exporterXlsx([{ nom: 'Trésorerie', lignes: this.lignesExport() }], 'GK-tresorerie');
  }
  exportCsv(): void {
    this.exporter.exporterCsv(this.lignesExport(), 'GK-tresorerie');
  }
  private lignesExport(): Record<string, unknown>[] {
    return this.lignes().map((l) => ({
      Date: this.fmtDate(l.date),
      Type: l.type,
      Montant: l.montant,
      Catégorie: l.categorie,
      Description: l.description,
      Solde: Number(l.solde.toFixed(2)),
      Auto: l.auto ? 'oui' : '',
    }));
  }

  private aujourdhui(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
