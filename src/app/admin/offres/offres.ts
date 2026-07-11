import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { Service } from '../../core/models/service.model';
import { redimensionnerImage } from '../../core/utils/image.util';

/**
 * Gestion des offres (services) : CRUD complet, réordonnancement, activation,
 * et téléversement d'affiche (stockée dans Blobs). Les changements se
 * répercutent sur le site public.
 */
@Component({
  selector: 'gk-admin-offres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './offres.html',
  styleUrl: './offres.scss',
})
export class OffresComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);

  readonly services = signal<Service[]>([]);
  readonly chargement = signal(true);
  readonly editionId = signal<string | null>(null);
  readonly uploadEnCours = signal(false);
  readonly erreurUpload = signal('');

  readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required]],
    prixMarche: [''],
    prixGK: [''],
    description: [''],
    image: ['default.webp'],
    ordre: [1],
    actif: [true],
  });

  constructor() {
    this.charger();
  }

  /** Services triés par ordre d'affichage. */
  readonly liste = computed(() =>
    [...this.services()].sort((a, b) => a.ordre - b.ordre),
  );

  /** URL d'aperçu d'une affiche (même logique que le site public). */
  apercu(image: string): string {
    if (!image) return '/assets/posters/default.webp';
    return image.startsWith('http') || image.startsWith('/') ? image : `/assets/posters/${image}`;
  }

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Service>('services').subscribe({
      next: (data) => {
        this.services.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveau(): void {
    const ordreMax = this.liste().reduce((m, s) => Math.max(m, s.ordre), 0);
    this.form.reset({
      nom: '',
      prixMarche: '',
      prixGK: '',
      description: '',
      image: 'default.webp',
      ordre: ordreMax + 1,
      actif: true,
    });
    this.erreurUpload.set('');
    this.editionId.set('');
  }

  ouvrirEdition(s: Service): void {
    this.form.reset({
      nom: s.nom,
      prixMarche: s.prixMarche,
      prixGK: s.prixGK,
      description: s.description,
      image: s.image,
      ordre: s.ordre,
      actif: s.actif,
    });
    this.erreurUpload.set('');
    this.editionId.set(s.id ?? '');
  }

  fermer(): void {
    this.editionId.set(null);
  }

  /** Sélection d'une affiche : redimensionnement puis upload vers Blobs. */
  async onFichier(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;
    this.erreurUpload.set('');
    this.uploadEnCours.set(true);
    try {
      const { dataBase64, contentType } = await redimensionnerImage(fichier, 900);
      this.api.uploadImage({ filename: fichier.name, contentType, dataBase64 }).subscribe({
        next: (r) => {
          this.form.patchValue({ image: r.url });
          this.uploadEnCours.set(false);
        },
        error: () => {
          this.erreurUpload.set('Échec du téléversement.');
          this.uploadEnCours.set(false);
        },
      });
    } catch {
      this.erreurUpload.set('Image invalide.');
      this.uploadEnCours.set(false);
    } finally {
      input.value = '';
    }
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const id = this.editionId();
    const req = id
      ? this.api.update<Service>('services', id, valeur)
      : this.api.create<Service>('services', valeur);
    req.subscribe(() => {
      this.fermer();
      this.charger();
    });
  }

  supprimer(s: Service): void {
    if (!s.id) return;
    if (!confirm(`Supprimer le service « ${s.nom} » ?`)) return;
    this.api.remove('services', s.id).subscribe(() => this.charger());
  }

  basculerActif(s: Service): void {
    if (!s.id) return;
    this.api.update<Service>('services', s.id, { actif: !s.actif }).subscribe(() => this.charger());
  }

  /** Réordonnancement : échange l'ordre avec le voisin puis persiste. */
  deplacer(s: Service, sens: -1 | 1): void {
    const liste = this.liste();
    const i = liste.findIndex((x) => x.id === s.id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return;
    const a = liste[i];
    const b = liste[j];
    if (!a.id || !b.id) return;
    // Échange des valeurs d'ordre.
    this.api.update<Service>('services', a.id, { ordre: b.ordre }).subscribe(() => {
      this.api.update<Service>('services', b.id!, { ordre: a.ordre }).subscribe(() => this.charger());
    });
  }
}
