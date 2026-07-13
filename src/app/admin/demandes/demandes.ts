import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';
import { DemandesBadgeService } from '../services/demandes-badge.service';
import { Demande, STATUTS_DEMANDE } from '../../core/models/demande.model';
import { Intervention } from '../../core/models/intervention.model';
import { formatDateCourte } from '../../core/utils/format.util';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/** Nombre de jours au-delà duquel un prospect non contacté est « à relancer ». */
const JOURS_RELANCE = 7;

/**
 * Registre des demandes entrantes (formulaire libre + diagnostic en ligne).
 * Filtres par statut, fiche détaillée (réponses + diagnostic), contact direct
 * (appel / WhatsApp), changement de statut, note, conversion en intervention,
 * relance des prospects dormants et suppression (droit à l'effacement).
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

  /** Filtre de statut actif (« tous » ou un statut précis). */
  readonly filtre = signal<'tous' | (typeof STATUTS_DEMANDE)[number]>('tous');

  constructor() {
    this.charger();
  }

  /** Priorité d'affichage : les demandes chaudes remontent. */
  private readonly ordreStatut: Record<string, number> = {
    'cas-inconnu': 0,
    'nouvelle-demande': 1,
    prospect: 2,
    contacté: 3,
    converti: 4,
    perdu: 5,
  };

  /** Demandes filtrées puis triées (chaudes d'abord, puis récentes). */
  readonly liste = computed(() => {
    const f = this.filtre();
    return this.demandes()
      .filter((d) => f === 'tous' || (d.statut ?? 'nouvelle-demande') === f)
      .sort((a, b) => {
        const pa = this.ordreStatut[a.statut ?? 'nouvelle-demande'] ?? 9;
        const pb = this.ordreStatut[b.statut ?? 'nouvelle-demande'] ?? 9;
        if (pa !== pb) return pa - pb;
        return (a.date ?? '') < (b.date ?? '') ? 1 : -1;
      });
  });

  /** Compteur par statut (pour les puces de filtre). */
  readonly compteurs = computed(() => {
    const c: Record<string, number> = { tous: this.demandes().length };
    for (const s of STATUTS_DEMANDE) c[s] = 0;
    for (const d of this.demandes()) {
      const s = d.statut ?? 'nouvelle-demande';
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  });

  /** Prospects de plus de 7 jours toujours au statut « prospect » (à relancer). */
  readonly prospectsDormants = computed(
    () => this.demandes().filter((d) => this.estDormant(d)).length,
  );

  /** Un prospect non contacté depuis plus de 7 jours ? */
  estDormant(d: Demande): boolean {
    if ((d.statut ?? '') !== 'prospect') return false;
    const t = Date.parse(d.date ?? '');
    if (Number.isNaN(t)) return false;
    return Date.now() - t > JOURS_RELANCE * 24 * 3600 * 1000;
  }

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

  setFiltre(f: 'tous' | (typeof STATUTS_DEMANDE)[number]): void {
    this.filtre.set(f);
  }

  /** Change le statut d'une demande. */
  changerStatut(d: Demande, statut: string): void {
    if (!d.id) return;
    this.api.update<Demande>('demandes', d.id, { statut }).subscribe(() => this.charger());
  }

  /** Marque / démarque « à relancer ». */
  basculerRelance(d: Demande): void {
    if (!d.id) return;
    this.api
      .update<Demande>('demandes', d.id, { aRelancer: !d.aRelancer })
      .subscribe(() => this.charger());
  }

  /** Enregistre la note interne (sur perte de focus). */
  enregistrerNote(d: Demande, texte: string): void {
    if (!d.id || (d.notesAdmin ?? '') === texte) return;
    this.api.update<Demande>('demandes', d.id, { notesAdmin: texte }).subscribe();
  }

  /** Lien WhatsApp vers le prospect (si son contact contient des chiffres). */
  lienWa(d: Demande): string | null {
    const chiffres = (d.telephone || d.contact || '').replace(/\D/g, '');
    if (chiffres.length < 6) return null;
    return lienWhatsApp(chiffres, `Bonjour ${d.nom}, ici GK SupportIT au sujet de votre demande. `);
  }

  /** Lien d'appel (tel:) si un numéro est disponible. */
  lienTel(d: Demande): string | null {
    const chiffres = (d.telephone || d.contact || '').replace(/[^\d+]/g, '');
    return chiffres.length >= 6 ? `tel:${chiffres}` : null;
  }

  /** Convertit la demande en intervention (pré-remplit le registre). */
  convertir(d: Demande): void {
    const intervention: Partial<Intervention> = {
      date: new Date().toISOString().slice(0, 10),
      client: d.nom,
      telephone: d.telephone || d.contact,
      appareil: d.appareil || d.typeMachine || '',
      probleme: d.description,
      service: d.serviceRecommande || d.service || '',
      coutPieces: 0,
      prixFacture: 0,
      paiement: 'Interac',
      statut: 'À planifier',
      avisDemande: false,
      notes:
        `Demande web du ${this.fmtDate(d.date ?? '')} — Secteur : ${d.secteur || '—'}` +
        (d.prixEstime ? ` — Estimation diagnostic : ${d.prixEstime}` : ''),
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
    if (!confirm(`Supprimer définitivement la demande de « ${d.nom} » ?`)) return;
    this.api.remove('demandes', d.id).subscribe(() => this.charger());
  }
}
