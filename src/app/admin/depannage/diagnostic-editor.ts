import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { ContentService } from '../../core/services/content.service';
import {
  ArbreDiagnostic,
  GraviteDiagnostic,
  QuestionDiagnostic,
  RegleDiagnostic,
  ResultatRegle,
  SymptomeDiagnostic,
} from '../../core/models/diagnostic.model';

/**
 * Éditeur de l'arbre du « Diagnostic gratuit » (clé Blobs « diagnostic-public »).
 * Permet d'affiner symptômes, questions, règles et estimations SANS redéployer.
 * Ne touche jamais au contenu technique (clé « pannes »).
 */
@Component({
  selector: 'gk-diagnostic-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './diagnostic-editor.html',
  styleUrl: './diagnostic-editor.scss',
})
export class DiagnosticEditorComponent {
  private api = inject(AdminApiService);
  private content = inject(ContentService);
  private fb = inject(FormBuilder);

  readonly gravites: GraviteDiagnostic[] = ['benin', 'surveiller', 'urgent'];
  readonly services = toSignal(this.content.getServices(), { initialValue: [] });

  readonly arbre = signal<ArbreDiagnostic>({ version: 1, symptomes: [] });
  readonly chargement = signal(true);
  readonly enregistrement = signal(false);
  readonly message = signal('');
  /** Index du symptôme en cours d'édition (-1 = aucun). */
  readonly selection = signal(-1);

  /** Formulaire du symptôme sélectionné (null si aucun). */
  form: FormGroup | null = null;

  constructor() {
    this.charger();
  }

  /** Symptômes triés par groupe puis libellé, pour la liste. */
  readonly liste = computed(() =>
    this.arbre().symptomes.map((s, i) => ({ s, i })),
  );

  private charger(): void {
    this.chargement.set(true);
    this.api.getObject<ArbreDiagnostic>('diagnostic-public').subscribe({
      next: (a) => {
        this.arbre.set(a ?? { version: 1, symptomes: [] });
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  // ---------- Construction du formulaire ----------

  private optionGroup(o = { label: '', valeur: '' }): FormGroup {
    return this.fb.nonNullable.group({
      label: [o.label, Validators.required],
      valeur: [o.valeur, Validators.required],
    });
  }

  private questionGroup(q: QuestionDiagnostic = { id: '', libelle: '', options: [] }): FormGroup {
    return this.fb.nonNullable.group({
      id: [q.id, Validators.required],
      libelle: [q.libelle, Validators.required],
      options: this.fb.array(q.options.map((o) => this.optionGroup(o))),
    });
  }

  private resultatGroup(r: ResultatRegle): FormGroup {
    return this.fb.nonNullable.group({
      panneId: [r.panneId ?? ''],
      gravite: [r.gravite, Validators.required],
      serviceId: [r.serviceId, Validators.required],
      prixEstime: [r.prixEstime, Validators.required],
      explication: [r.explication, Validators.required],
      alerte: [r.alerte ?? ''],
      inconclusif: [!!r.inconclusif],
    });
  }

  private conditionGroup(questionId = '', valeur = ''): FormGroup {
    return this.fb.nonNullable.group({ questionId: [questionId], valeur: [valeur] });
  }

  private regleGroup(r: RegleDiagnostic): FormGroup {
    return this.fb.nonNullable.group({
      conditions: this.fb.array(
        Object.entries(r.si).map(([q, v]) => this.conditionGroup(q, v)),
      ),
      alors: this.resultatGroup(r.alors),
    });
  }

  private symptomeForm(s: SymptomeDiagnostic): FormGroup {
    return this.fb.nonNullable.group({
      id: [s.id, Validators.required],
      libellePublic: [s.libellePublic, Validators.required],
      icone: [s.icone],
      groupe: [s.groupe, Validators.required],
      champLibre: [!!s.champLibre],
      brouillon: [!!s.brouillon],
      questions: this.fb.array(s.questions.map((q) => this.questionGroup(q))),
      regles: this.fb.array(s.regles.map((r) => this.regleGroup(r))),
      resultatParDefaut: this.resultatGroup(s.resultatParDefaut),
    });
  }

  // ---------- Accès aux FormArray (template) ----------

  get questions(): FormArray {
    return this.form?.get('questions') as FormArray;
  }
  get regles(): FormArray {
    return this.form?.get('regles') as FormArray;
  }
  optionsDe(q: number): FormArray {
    return this.questions.at(q).get('options') as FormArray;
  }
  conditionsDe(r: number): FormArray {
    return this.regles.at(r).get('conditions') as FormArray;
  }

  /** Ids de questions disponibles (pour les listes déroulantes des conditions). */
  readonly idsQuestions = signal<string[]>([]);
  rafraichirIds(): void {
    this.idsQuestions.set(
      this.questions.controls.map((c) => String(c.get('id')?.value ?? '')).filter(Boolean),
    );
  }

  // ---------- Sélection / édition ----------

  editer(i: number): void {
    this.message.set('');
    this.selection.set(i);
    this.form = this.symptomeForm(this.arbre().symptomes[i]);
    this.rafraichirIds();
  }

  nouveauSymptome(): void {
    const vierge: SymptomeDiagnostic = {
      id: 'nouveau-' + Date.now().toString(36),
      libellePublic: 'Nouveau symptôme',
      icone: '❓',
      groupe: 'Autre',
      questions: [],
      regles: [],
      resultatParDefaut: {
        panneId: null,
        gravite: 'surveiller',
        serviceId: 'diagnostic',
        prixEstime: 'à confirmer sur place',
        explication: '',
        alerte: null,
      },
    };
    this.arbre.update((a) => ({ ...a, symptomes: [...a.symptomes, vierge] }));
    this.editer(this.arbre().symptomes.length - 1);
  }

  fermer(): void {
    this.selection.set(-1);
    this.form = null;
  }

  // ---------- Manipulation des tableaux ----------

  ajouterQuestion(): void {
    this.questions.push(this.questionGroup({ id: 'q' + (this.questions.length + 1), libelle: '', options: [] }));
    this.rafraichirIds();
  }
  retirerQuestion(i: number): void {
    this.questions.removeAt(i);
    this.rafraichirIds();
  }
  ajouterOption(q: number): void {
    this.optionsDe(q).push(this.optionGroup());
  }
  retirerOption(q: number, o: number): void {
    this.optionsDe(q).removeAt(o);
  }
  ajouterRegle(): void {
    const parDefaut = this.form?.get('resultatParDefaut')?.value as ResultatRegle;
    this.regles.push(this.regleGroup({ si: {}, alors: { ...parDefaut } }));
  }
  retirerRegle(i: number): void {
    this.regles.removeAt(i);
  }
  ajouterCondition(r: number): void {
    this.conditionsDe(r).push(this.conditionGroup());
  }
  retirerCondition(r: number, c: number): void {
    this.conditionsDe(r).removeAt(c);
  }

  // ---------- Enregistrement ----------

  enregistrer(): void {
    if (!this.form) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('⚠️ Formulaire incomplet — vérifiez les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue() as {
      id: string;
      libellePublic: string;
      icone: string;
      groupe: string;
      champLibre: boolean;
      brouillon: boolean;
      questions: { id: string; libelle: string; options: { label: string; valeur: string }[] }[];
      regles: {
        conditions: { questionId: string; valeur: string }[];
        alors: ResultatRegle & { panneId: string; inconclusif: boolean };
      }[];
      resultatParDefaut: ResultatRegle & { panneId: string; inconclusif: boolean };
    };

    const nettoyerResultat = (
      r: ResultatRegle & { panneId: string; inconclusif: boolean },
    ): ResultatRegle => ({
      panneId: r.panneId ? r.panneId : null,
      gravite: r.gravite,
      serviceId: r.serviceId,
      prixEstime: r.prixEstime,
      explication: r.explication,
      alerte: r.alerte ? r.alerte : null,
      ...(r.inconclusif ? { inconclusif: true } : {}),
    });

    const symptome: SymptomeDiagnostic = {
      id: v.id,
      libellePublic: v.libellePublic,
      icone: v.icone,
      groupe: v.groupe,
      ...(v.champLibre ? { champLibre: true } : {}),
      ...(v.brouillon ? { brouillon: true } : {}),
      questions: v.questions.map((q) => ({
        id: q.id,
        libelle: q.libelle,
        options: q.options,
      })),
      regles: v.regles.map((r) => ({
        si: Object.fromEntries(
          r.conditions.filter((c) => c.questionId && c.valeur).map((c) => [c.questionId, c.valeur]),
        ),
        alors: nettoyerResultat(r.alors),
      })),
      resultatParDefaut: nettoyerResultat(v.resultatParDefaut),
    };

    const i = this.selection();
    const symptomes = [...this.arbre().symptomes];
    symptomes[i] = symptome;
    const nouvelArbre: ArbreDiagnostic = { ...this.arbre(), symptomes };

    this.enregistrement.set(true);
    this.api.putObject('diagnostic-public', nouvelArbre).subscribe({
      next: () => {
        this.arbre.set(nouvelArbre);
        this.enregistrement.set(false);
        this.message.set('✓ Enregistré. Modifications visibles immédiatement côté client.');
      },
      error: () => {
        this.enregistrement.set(false);
        this.message.set('✗ Échec de l’enregistrement. Réessayez.');
      },
    });
  }

  supprimerSymptome(i: number): void {
    const s = this.arbre().symptomes[i];
    if (!confirm(`Retirer le symptôme « ${s.libellePublic} » du diagnostic client ?`)) return;
    const symptomes = this.arbre().symptomes.filter((_, idx) => idx !== i);
    const nouvelArbre: ArbreDiagnostic = { ...this.arbre(), symptomes };
    this.api.putObject('diagnostic-public', nouvelArbre).subscribe(() => {
      this.arbre.set(nouvelArbre);
      this.fermer();
    });
  }
}
