import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';
import { DemandesBadgeService } from '../services/demandes-badge.service';
import { Demande, STATUTS_DEMANDE } from '../../core/models/demande.model';
import { Intervention } from '../../core/models/intervention.model';
import { formatDateCourte } from '../../core/utils/format.util';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/**
 * Registre des demandes entrantes (prospects du formulaire public).
 * Permet de suivre le statut, de contacter le prospect (WhatsApp) et de
 * convertir une demande en intervention (pré-remplit le registre).
 */
@Component({
  selector: 'gk-admin-demandes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demandes.html',
  styleUrl: './demandes.scss',
})
export class DemandesComponent {
  private api = inject(AdminApiService);
  private badge = inject(DemandesBadgeService);
  private router = inject(Router);

  readonly statuts = STATUTS_DEMANDE;
  readonly demandes = signal<Demande[]>([]);
  readonly chargement = signal(true);
  readonly fmtDate = formatDateCourte;

  constructor() {
    this.charger();
  }

  /** Demandes triées de la plus récente à la plus ancienne. */
  readonly liste = computed(() =>
    [...this.demandes()].sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1)),
  );

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Demande>('demandes').subscribe({
      next: (data) => {
        this.demandes.set(data);
        this.chargement.set(false);
        this.badge.refresh();
      },
      error: () => this.chargement.set(false),
    });
  }

  /** Change le statut d'une demande. */
  changerStatut(d: Demande, statut: string): void {
    if (!d.id) return;
    this.api.update<Demande>('demandes', d.id, { statut }).subscribe(() => this.charger());
  }

  /** Lien WhatsApp vers le prospect (si son contact contient des chiffres). */
  lienWa(d: Demande): string | null {
    const chiffres = (d.contact ?? '').replace(/\D/g, '');
    if (chiffres.length < 6) return null;
    return lienWhatsApp(chiffres, `Bonjour ${d.nom}, ici GK SupportIT au sujet de votre demande. `);
  }

  /** Convertit la demande en intervention (pré-remplit le registre). */
  convertir(d: Demande): void {
    const intervention: Partial<Intervention> = {
      date: new Date().toISOString().slice(0, 10),
      client: d.nom,
      telephone: d.contact,
      appareil: d.appareil,
      probleme: d.description,
      service: d.service ?? '',
      coutPieces: 0,
      prixFacture: 0,
      paiement: 'Interac',
      statut: 'À planifier',
      avisDemande: false,
      notes: `Demande web du ${this.fmtDate(d.date ?? '')} — Secteur : ${d.secteur}`,
    };
    this.api.create<Intervention>('interventions', intervention).subscribe(() => {
      if (d.id) {
        this.api.update<Demande>('demandes', d.id, { statut: 'converti' }).subscribe(() => {
          this.badge.refresh();
          this.router.navigate(['/admin/interventions']);
        });
      } else {
        this.router.navigate(['/admin/interventions']);
      }
    });
  }

  supprimer(d: Demande): void {
    if (!d.id) return;
    if (!confirm(`Supprimer la demande de « ${d.nom} » ?`)) return;
    this.api.remove('demandes', d.id).subscribe(() => this.charger());
  }
}
