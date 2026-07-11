import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import QRCode from 'qrcode';
import { AdminApiService } from '../services/admin-api.service';
import { Carte } from '../../core/models/carte.model';

/**
 * Gestion des cartes de visite numériques : CRUD, activation, et récupération
 * du QR code (à imprimer sur un flyer, un autocollant, etc.).
 */
@Component({
  selector: 'gk-admin-cartes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './cartes.html',
  styleUrl: './cartes.scss',
})
export class CartesComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);

  readonly cartes = signal<Carte[]>([]);
  readonly chargement = signal(true);
  readonly editionId = signal<string | null>(null);
  /** Carte dont on affiche le QR (null = fermé). */
  readonly qrCarte = signal<Carte | null>(null);
  readonly qrData = signal<string>('');

  readonly origine = typeof window !== 'undefined' ? window.location.origin : '';

  readonly form = this.fb.nonNullable.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    nom: ['', [Validators.required]],
    role: [''],
    telephone: [''],
    whatsapp: [''],
    email: [''],
    actif: [true],
  });

  constructor() {
    this.charger();
  }

  readonly liste = computed(() => this.cartes());

  urlCarte(slug: string): string {
    return `${this.origine}/carte/${slug}`;
  }

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Carte>('cartes').subscribe({
      next: (data) => {
        this.cartes.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveau(): void {
    this.form.reset({ slug: '', nom: '', role: '', telephone: '', whatsapp: '', email: '', actif: true });
    this.editionId.set('');
  }

  ouvrirEdition(c: Carte): void {
    this.form.reset({
      slug: c.slug,
      nom: c.nom,
      role: c.role,
      telephone: c.telephone,
      whatsapp: c.whatsapp,
      email: c.email,
      actif: c.actif,
    });
    this.editionId.set(c.id ?? '');
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
      ? this.api.update<Carte>('cartes', id, valeur)
      : this.api.create<Carte>('cartes', valeur);
    req.subscribe(() => {
      this.fermer();
      this.charger();
    });
  }

  supprimer(c: Carte): void {
    if (!c.id) return;
    if (!confirm(`Supprimer la carte « ${c.nom} » ?`)) return;
    this.api.remove('cartes', c.id).subscribe(() => this.charger());
  }

  basculerActif(c: Carte): void {
    if (!c.id) return;
    this.api.update<Carte>('cartes', c.id, { actif: !c.actif }).subscribe(() => this.charger());
  }

  // --- QR code ---
  async ouvrirQr(c: Carte): Promise<void> {
    this.qrCarte.set(c);
    this.qrData.set('');
    try {
      const data = await QRCode.toDataURL(this.urlCarte(c.slug), {
        margin: 1,
        width: 320,
        color: { dark: '#0f2d52', light: '#ffffff' },
      });
      this.qrData.set(data);
    } catch {
      /* non bloquant */
    }
  }

  fermerQr(): void {
    this.qrCarte.set(null);
  }

  telechargerQr(): void {
    const c = this.qrCarte();
    const data = this.qrData();
    if (!c || !data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `qr-carte-${c.slug}.png`;
    a.click();
  }
}
