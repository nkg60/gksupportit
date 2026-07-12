import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { FAMILLES_PANNE, Panne } from '../../core/models/panne.model';
import { ArbreDiagnostic, SymptomeDiagnostic } from '../../core/models/diagnostic.model';
import {
  pannesDuSymptome,
  statutPanne,
} from '../../core/utils/diagnostic-link.util';

/**
 * Gestion du guide des pannes : liste par famille + CRUD complet.
 * Lien avec le diagnostic client : interrupteur « Détectable par le diagnostic
 * client » qui génère un brouillon d'entrée publique (à compléter puis publier
 * dans l'onglet « Diagnostic client »), badge de statut, et confirmation à la
 * suppression si une entrée publique référence la panne.
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
  readonly arbre = signal<ArbreDiagnostic>({ version: 1, symptomes: [] });
  readonly chargement = signal(true);
  readonly editionId = signal<string | null>(null);
  readonly messageDiag = signal('');

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
    detectable: [false],
  });

  constructor() {
    this.charger();
  }

  /** Pannes triées par numéro. */
  readonly liste = computed(() => [...this.pannes()].sort((a, b) => a.numero - b.numero));

  /** Statut d'une panne vis-à-vis du diagnostic client (pour le badge). */
  statut(p: Panne): 'visible' | 'brouillon' | 'aucun' {
    return statutPanne(this.arbre(), p.id);
  }

  private charger(): void {
    this.chargement.set(true);
    this.api.list<Panne>('pannes').subscribe({
      next: (data) => {
        this.pannes.set(data);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
    this.api.getObject<ArbreDiagnostic>('diagnostic-public').subscribe({
      next: (a) => this.arbre.set(a ?? { version: 1, symptomes: [] }),
      error: () => {},
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
      detectable: false,
    });
    this.messageDiag.set('');
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
      detectable: this.statut(p) !== 'aucun',
    });
    this.messageDiag.set('');
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
    req.subscribe((res) => {
      const enregistree: Panne = { ...(panne as Panne), id: id || res.item?.id };
      this.appliquerDetectable(enregistree, v.detectable);
    });
  }

  /**
   * Applique l'interrupteur « Détectable » :
   *  - activé & aucune entrée → génère un BROUILLON (rien n'est publié tel quel) ;
   *  - désactivé & brouillon existant → retire le brouillon ;
   *  - désactivé & entrée publiée → laissée en place (à retirer depuis l'éditeur).
   */
  private appliquerDetectable(panne: Panne, detectable: boolean): void {
    const statut = statutPanne(this.arbre(), panne.id);

    if (detectable && statut === 'aucun') {
      const symptomes = [...this.arbre().symptomes, this.genererBrouillon(panne)];
      this.sauverArbre({ ...this.arbre(), symptomes }, () =>
        this.terminer('📝 Brouillon créé — complétez-le puis publiez-le dans l’onglet « Diagnostic client ».'),
      );
      return;
    }
    if (!detectable && statut === 'brouillon') {
      const symptomes = this.arbre().symptomes.filter(
        (s) => !(s.brouillon && !!panne.id && pannesDuSymptome(s).includes(panne.id)),
      );
      this.sauverArbre({ ...this.arbre(), symptomes }, () =>
        this.terminer('Brouillon retiré du diagnostic client.'),
      );
      return;
    }
    if (!detectable && statut === 'visible') {
      this.terminer(
        '⚠️ Une entrée PUBLIÉE référence cette panne : retirez-la manuellement dans l’onglet « Diagnostic client ».',
      );
      return;
    }
    this.terminer('');
  }

  /** Construit un brouillon d'entrée publique à partir d'une panne. */
  private genererBrouillon(panne: Panne): SymptomeDiagnostic {
    const questions = (panne.etapes ?? [])
      .filter((e) => e && e.trim())
      .slice(0, 4)
      .map((e, i) => ({
        id: 'q' + (i + 1),
        libelle: e.length > 120 ? e.slice(0, 120) + '…' : e,
        options: [
          { label: 'Oui', valeur: 'oui' },
          { label: 'Non', valeur: 'non' },
          { label: 'Je ne sais pas', valeur: 'inconnu' },
        ],
      }));
    return {
      id: 'brouillon-' + (panne.id ?? Date.now().toString(36)),
      libellePublic: panne.titre,
      icone: '🩺',
      groupe: FAMILLES_PANNE[panne.famille] ?? 'Autre',
      brouillon: true,
      questions,
      regles: [],
      resultatParDefaut: {
        panneId: panne.id ?? null,
        gravite: 'surveiller',
        serviceId: 'diagnostic',
        prixEstime: panne.prix || 'à confirmer sur place',
        explication: panne.symptome ? `${panne.titre} — ${panne.symptome}.` : `${panne.titre}.`,
        alerte: null,
      },
    };
  }

  private sauverArbre(arbre: ArbreDiagnostic, apres: () => void): void {
    this.api.putObject('diagnostic-public', arbre).subscribe({
      next: () => {
        this.arbre.set(arbre);
        apres();
      },
      error: () => this.terminer('✗ Échec de la mise à jour du diagnostic client.'),
    });
  }

  private terminer(message: string): void {
    this.messageDiag.set(message);
    this.fermer();
    this.charger();
  }

  supprimer(p: Panne): void {
    if (!p.id) return;
    const st = this.statut(p);
    let msg = `Supprimer la panne « ${p.titre} » ?`;
    if (st !== 'aucun') {
      msg +=
        `\n\n⚠️ Une entrée du diagnostic client (${st === 'visible' ? 'publiée' : 'brouillon'}) ` +
        `référence cette panne. Elle NE sera PAS supprimée automatiquement et deviendra « orpheline ». ` +
        `Retirez-la depuis l’onglet « Diagnostic client » si nécessaire.`;
    }
    if (!confirm(msg)) return;
    this.api.remove('pannes', p.id).subscribe(() => this.charger());
  }
}
