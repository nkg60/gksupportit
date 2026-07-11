import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { SiteSettings } from '../../core/models/site-settings.model';

/**
 * Paramètres du site, éditables depuis l'admin : numéro WhatsApp, courriel,
 * horaires, zone de service, supplément hors zone, texte « À propos », et
 * capital de départ (utilisé par le tableau de bord).
 */
@Component({
  selector: 'gk-admin-parametres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class ParametresComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);

  readonly chargement = signal(true);
  readonly enregistrement = signal(false);
  readonly succes = signal(false);

  readonly form = this.fb.nonNullable.group({
    whatsappNumber: ['', [Validators.required]],
    whatsappDisplay: [''],
    email: ['', [Validators.email]],
    horaires: [''],
    zoneService: [''],
    supplementHorsZone: [''],
    aboutText: [''],
    capitalDepart: [0],
  });

  constructor() {
    this.api.getSettings().subscribe({
      next: (s) => {
        this.form.patchValue(s);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enregistrement.set(true);
    this.succes.set(false);
    this.api.putSettings(this.form.getRawValue() as SiteSettings).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.succes.set(true);
      },
      error: () => this.enregistrement.set(false),
    });
  }
}
