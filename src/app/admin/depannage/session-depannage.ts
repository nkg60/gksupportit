import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';
import { FAMILLES_PANNE, Panne } from '../../core/models/panne.model';
import { EtapeCochee, SessionDepannage } from '../../core/models/session-depannage.model';
import { Intervention } from '../../core/models/intervention.model';

/** Groupe de pannes d'une même famille (pour le sélecteur de symptôme). */
interface GroupeFamille {
  cle: string;
  label: string;
  pannes: Panne[];
}

/**
 * Session de dépannage guidé : l'admin choisit un symptôme, coche l'arbre de
 * vérification étape par étape, obtient le verdict + service/prix recommandés,
 * puis peut enregistrer la session ou la convertir en intervention.
 */
@Component({
  selector: 'gk-session-depannage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './session-depannage.html',
  styleUrl: './session-depannage.scss',
})
export class SessionDepannageComponent {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  /** Étape de l'assistant. */
  readonly etape = signal<'client' | 'symptome' | 'arbre' | 'verdict'>('client');
  readonly pannes = signal<Panne[]>([]);
  readonly recherche = signal('');
  readonly panne = signal<Panne | null>(null);
  readonly etapesCochees = signal<EtapeCochee[]>([]);
  readonly enregistre = signal(false);

  readonly clientForm = this.fb.nonNullable.group({
    client: [''],
    appareil: [''],
  });

  constructor() {
    this.api.list<Panne>('pannes').subscribe((data) => this.pannes.set(data));
  }

  /** Pannes filtrées par la recherche, regroupées par famille. */
  readonly groupes = computed<GroupeFamille[]>(() => {
    const q = this.recherche().trim().toLowerCase();
    const filtrees = this.pannes()
      .filter((p) => {
        if (!q) return true;
        return (
          p.titre.toLowerCase().includes(q) ||
          p.symptome.toLowerCase().includes(q) ||
          (FAMILLES_PANNE[p.famille] ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.numero - b.numero);

    return Object.keys(FAMILLES_PANNE)
      .map((cle) => ({
        cle,
        label: FAMILLES_PANNE[cle],
        pannes: filtrees.filter((p) => p.famille === cle),
      }))
      .filter((g) => g.pannes.length > 0);
  });

  // --- Navigation de l'assistant ---
  demarrer(): void {
    this.etape.set('symptome');
  }

  choisirPanne(p: Panne): void {
    this.panne.set(p);
    this.etapesCochees.set(p.etapes.map(() => ({ coche: false, note: '' })));
    this.etape.set('arbre');
  }

  basculerEtape(i: number): void {
    this.etapesCochees.update((arr) => {
      const copie = [...arr];
      copie[i] = { ...copie[i], coche: !copie[i].coche };
      return copie;
    });
  }

  noterEtape(i: number, valeur: string): void {
    this.etapesCochees.update((arr) => {
      const copie = [...arr];
      copie[i] = { ...copie[i], note: valeur };
      return copie;
    });
  }

  voirVerdict(): void {
    this.etape.set('verdict');
  }

  retourArbre(): void {
    this.etape.set('arbre');
  }

  recommencer(): void {
    this.panne.set(null);
    this.etapesCochees.set([]);
    this.recherche.set('');
    this.enregistre.set(false);
    this.clientForm.reset({ client: '', appareil: '' });
    this.etape.set('client');
  }

  /** Construit l'objet session à partir de l'état courant. */
  private construireSession(convertie: boolean): SessionDepannage {
    const p = this.panne();
    const c = this.clientForm.getRawValue();
    return {
      date: new Date().toISOString().slice(0, 10),
      client: c.client,
      appareil: c.appareil,
      panneId: p?.id ?? '',
      panneTitre: p?.titre ?? '',
      etapesCochees: this.etapesCochees(),
      verdict: p?.verdict ?? '',
      serviceRecommande: p?.serviceRecommande ?? '',
      prix: p?.prix ?? '',
      convertieEnIntervention: convertie,
    };
  }

  /** Enregistre la session (sans conversion). */
  enregistrerSession(): void {
    this.api.create<SessionDepannage>('sessions', this.construireSession(false)).subscribe(() => {
      this.enregistre.set(true);
    });
  }

  /** Convertit la session en intervention (pré-remplit le registre). */
  convertirEnIntervention(): void {
    const p = this.panne();
    const c = this.clientForm.getRawValue();
    if (!p) return;

    // Résumé des étapes cochées pour les notes.
    const detailEtapes = this.etapesCochees()
      .map((e, i) => `${'ABCD'[i]}${e.coche ? ' ✓' : ''}${e.note ? ' — ' + e.note : ''}`)
      .join('\n');

    const intervention: Partial<Intervention> = {
      date: new Date().toISOString().slice(0, 10),
      client: c.client,
      telephone: '',
      appareil: c.appareil,
      probleme: `${p.titre} (${p.symptome})`,
      service: p.serviceRecommande,
      coutPieces: 0,
      prixFacture: 0,
      paiement: 'Interac',
      statut: 'À planifier',
      avisDemande: false,
      notes: `Diagnostic guidé — Verdict : ${p.verdict}\nPrix estimé : ${p.prix}\n${detailEtapes}`,
    };

    // Enregistre la session (marquée convertie) puis crée l'intervention.
    this.api.create<SessionDepannage>('sessions', this.construireSession(true)).subscribe();
    this.api.create<Intervention>('interventions', intervention).subscribe(() => {
      this.router.navigate(['/admin/interventions']);
    });
  }
}
