import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { FAMILLES_PANNE, Panne } from '../../core/models/panne.model';

/**
 * Gestion du guide des pannes : liste par famille + CRUD complet (le guide
 * évoluera après les premières interventions).
 */
@Component({
  selector: 'gk-guide-pannes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './guide-pannes.html',
  styleUrl: './guide-pannes.scss',
})
export class GuidePannesComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);

  readonly familles = FAMILLES_PANNE;
  readonly famillesKeys = Object.keys(FAMILLES_PANNE);
  readonly pannes = signal<Panne[]>([]);
  readonly chargement = signal(true);
  readonly editionId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    famille: ['A', [Validators.required]],
    numero: [1, [Validators.required]],
    titre: ['', [Validators.required]],
    symptome: [''],
    etapeA: [''],
    etapeB: [''],
    etapeC: [''],
    etapeD: [''],
    verdict: [''],
    serviceRecommande: [''],
    prix: [''],
  });

  constructor() {
    this.charger();
  }

  /** Pannes triées par numéro. */
  readonly liste = computed(() => [...this.pannes()].sort((a, b) => a.numero - b.numero));

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Panne>('pannes').subscribe({
      next: (data) => {
        this.pannes.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveau(): void {
    const numMax = this.liste().reduce((m, p) => Math.max(m, p.numero), 0);
    this.form.reset({
      famille: 'A',
      numero: numMax + 1,
      titre: '',
      symptome: '',
      etapeA: '',
      etapeB: '',
      etapeC: '',
      etapeD: '',
      verdict: '',
      serviceRecommande: '',
      prix: '',
    });
    this.editionId.set('');
  }

  ouvrirEdition(p: Panne): void {
    this.form.reset({
      famille: p.famille,
      numero: p.numero,
      titre: p.titre,
      symptome: p.symptome,
      etapeA: p.etapes[0] ?? '',
      etapeB: p.etapes[1] ?? '',
      etapeC: p.etapes[2] ?? '',
      etapeD: p.etapes[3] ?? '',
      verdict: p.verdict,
      serviceRecommande: p.serviceRecommande,
      prix: p.prix,
    });
    this.editionId.set(p.id ?? '');
  }

  fermer(): void {
    this.editionId.set(null);
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const panne: Partial<Panne> = {
      famille: v.famille,
      numero: Number(v.numero),
      titre: v.titre,
      symptome: v.symptome,
      etapes: [v.etapeA, v.etapeB, v.etapeC, v.etapeD],
      verdict: v.verdict,
      serviceRecommande: v.serviceRecommande,
      prix: v.prix,
    };
    const id = this.editionId();
    const req = id
      ? this.api.update<Panne>('pannes', id, panne)
      : this.api.create<Panne>('pannes', panne);
    req.subscribe(() => {
      this.fermer();
      this.charger();
    });
  }

  supprimer(p: Panne): void {
    if (!p.id) return;
    if (!confirm(`Supprimer la panne « ${p.titre} » ?`)) return;
    this.api.remove('pannes', p.id).subscribe(() => this.charger());
  }
}
