import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { Demande } from '../../core/models/demande.model';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/**
 * Formulaire public « Décrire mon problème ».
 * À la soumission : enregistre la demande (Phase 1 = simulation, Phase 2 = Blobs)
 * puis propose un bouton « Continuer sur WhatsApp » avec un résumé pré-rempli.
 */
@Component({
  selector: 'gk-describe-problem',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoDirective],
  templateUrl: './describe-problem.html',
  styleUrl: './describe-problem.scss',
})
export class DescribeProblemComponent {
  private fb = inject(FormBuilder);
  private content = inject(ContentService);

  readonly settings = toSignal(this.content.getSettings());
  readonly services = toSignal(this.content.getServices(), { initialValue: [] });

  /** État de la soumission. */
  readonly envoi = signal(false);
  readonly succes = signal(false);
  /** Demande soumise (pour construire le lien WhatsApp de suivi). */
  private readonly derniereDemande = signal<Demande | null>(null);

  /** Formulaire réactif avec validation. */
  readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    contact: ['', [Validators.required, Validators.minLength(6)]],
    appareil: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    service: [''],
    secteur: ['', [Validators.required]],
  });

  /** Lien WhatsApp de suivi, construit à partir de la demande envoyée. */
  readonly lienSuivi = computed(() => {
    const d = this.derniereDemande();
    const s = this.settings();
    if (!d || !s) return '#';
    const resume =
      `Bonjour GK SupportIT, voici ma demande :\n` +
      `• Nom : ${d.nom}\n` +
      `• Appareil : ${d.appareil}\n` +
      `• Problème : ${d.description}\n` +
      (d.service ? `• Service souhaité : ${d.service}\n` : '') +
      `• Secteur : ${d.secteur}`;
    return lienWhatsApp(s.whatsappNumber, resume);
  });

  /** Indique si un champ est en erreur ET a été touché (pour l'affichage). */
  enErreur(champ: string): boolean {
    const c = this.form.get(champ);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.envoi.set(true);
    const demande: Demande = { ...this.form.getRawValue(), statut: 'nouveau' };
    this.content.submitDemande(demande).subscribe({
      next: () => {
        this.derniereDemande.set(demande);
        this.succes.set(true);
        this.envoi.set(false);
      },
      error: () => this.envoi.set(false),
    });
  }

  /** Réinitialise pour une nouvelle demande. */
  nouvelle(): void {
    this.form.reset();
    this.succes.set(false);
    this.derniereDemande.set(null);
  }
}
