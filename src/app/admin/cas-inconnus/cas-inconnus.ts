import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';
import { DemandesBadgeService } from '../services/demandes-badge.service';
import { PanneDraftService } from '../services/panne-draft.service';
import { Demande } from '../../core/models/demande.model';
import { formatDateCourte } from '../../core/utils/format.util';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/**
 * Vue dédiée « Cas non répertoriés » — les diagnostics non concluants ou
 * « Autre problème ». Ces prospects ont un vrai problème et aucune réponse :
 * ils sont prioritaires. Chaque cas peut devenir une nouvelle panne du guide.
 */
@Component({
  selector: 'gk-admin-cas-inconnus',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cas-inconnus.html',
  styleUrl: './cas-inconnus.scss',
})
export class CasInconnusComponent {
  private api = inject(AdminApiService);
  private badge = inject(DemandesBadgeService);
  private draftSvc = inject(PanneDraftService);
  private router = inject(Router);

  readonly demandes = signal<Demande[]>([]);
  readonly chargement = signal(true);
  readonly fmtDate = formatDateCourte;

  constructor() {
    this.charger();
  }

  /** Cas non répertoriés (non concluants / « Autre »), les plus récents d'abord. */
  readonly liste = computed(() =>
    this.demandes()
      .filter((d) => d.casInconnu || d.statut === 'cas-inconnu')
      .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1)),
  );

  /** Non-traités (encore au statut « cas-inconnu »). */
  readonly aTraiter = computed(
    () => this.liste().filter((d) => (d.statut ?? '') === 'cas-inconnu').length,
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

  changerStatut(d: Demande, statut: string): void {
    if (!d.id) return;
    this.api.update<Demande>('demandes', d.id, { statut }).subscribe(() => this.charger());
  }

  enregistrerNote(d: Demande, texte: string): void {
    if (!d.id || (d.notesAdmin ?? '') === texte) return;
    this.api.update<Demande>('demandes', d.id, { notesAdmin: texte }).subscribe();
  }

  lienWa(d: Demande): string | null {
    const chiffres = (d.telephone || d.contact || '').replace(/\D/g, '');
    if (chiffres.length < 6) return null;
    const ctx = d.descriptionLibre || d.symptomeChoisi || '';
    return lienWhatsApp(
      chiffres,
      `Bonjour ${d.nom}, ici GK SupportIT au sujet de votre demande` + (ctx ? ` : « ${ctx} »` : '') + '. ',
    );
  }

  lienTel(d: Demande): string | null {
    const chiffres = (d.telephone || d.contact || '').replace(/[^\d+]/g, '');
    return chiffres.length >= 6 ? `tel:${chiffres}` : null;
  }

  /** Crée une nouvelle panne pré-remplie à partir de ce cas. */
  creerPanne(d: Demande): void {
    const desc = (d.descriptionLibre || d.symptomeChoisi || d.description || '').trim();
    this.draftSvc.set({
      titre: desc.length > 70 ? desc.slice(0, 70) + '…' : desc || 'Nouveau cas',
      symptome: desc,
      // La « Description » redit la description libre : on ne garde que les vraies réponses.
      reponses: (d.reponses ?? []).filter((r) => r.question !== 'Description'),
      photoUrl: d.photoUrl,
      demandeId: d.id,
    });
    this.router.navigate(['/admin/depannage']);
  }

  supprimer(d: Demande): void {
    if (!d.id) return;
    if (!confirm(`Supprimer définitivement la demande de « ${d.nom} » ?`)) return;
    this.api.remove('demandes', d.id).subscribe(() => this.charger());
  }
}
