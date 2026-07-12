import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DiagnosticService } from '../../core/services/diagnostic.service';
import { ContentService } from '../../core/services/content.service';
import { Service } from '../../core/models/service.model';
import {
  DiagnosticResolu,
  DiagnosticSubmission,
  LIBELLES_GRAVITE,
  SymptomeDiagnostic,
} from '../../core/models/diagnostic.model';
import { ServiceCardComponent } from '../../shared/service-card/service-card';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/** Étapes du parcours de diagnostic. */
type EtapeDiagnostic = 'accueil' | 'symptome' | 'questions' | 'contact' | 'resultat';

/** Valide qu'au moins un moyen de contact (téléphone OU e-mail) est renseigné. */
function auMoinsUnContact(group: AbstractControl): { contactManquant: true } | null {
  const tel = (group.get('telephone')?.value ?? '').trim();
  const mail = (group.get('email')?.value ?? '').trim();
  return tel || mail ? null : { contactManquant: true };
}

/**
 * « Diagnostic gratuit en 2 minutes » — parcours public.
 *
 * Parcours : accueil → symptôme → précisions → coordonnées (+ consentement)
 * → résultat. Le visiteur peut aussi voir son résultat SANS laisser ses
 * coordonnées (le résultat n'est jamais retenu en otage).
 *
 * N'expose jamais de procédure de réparation ni la clé « pannes ».
 */
@Component({
  selector: 'gk-diagnostic',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, ServiceCardComponent],
  templateUrl: './diagnostic.html',
  styleUrl: './diagnostic.scss',
})
export class DiagnosticComponent {
  private diag = inject(DiagnosticService);
  private content = inject(ContentService);
  private fb = inject(FormBuilder);

  readonly gravites = LIBELLES_GRAVITE;

  private readonly arbre = toSignal(this.diag.getArbre(), {
    initialValue: { version: 0, symptomes: [] },
  });
  private readonly services = toSignal(this.content.getServices(), { initialValue: [] });
  readonly settings = toSignal(this.content.getSettings());

  /** État du parcours. */
  readonly etape = signal<EtapeDiagnostic>('accueil');
  readonly symptomeChoisi = signal<SymptomeDiagnostic | null>(null);
  readonly reponses = signal<Record<string, string>>({});
  readonly champLibre = signal('');

  /** État de l'enregistrement. */
  readonly demandeId = signal<string | null>(null);
  readonly intentionIntervention = signal(false);
  readonly envoi = signal(false);
  readonly interventionConfirmee = signal(false);

  /** Formulaire de contact (écran avant résultat). */
  readonly form = this.fb.nonNullable.group(
    {
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: [''],
      email: ['', [Validators.email]],
      typeMachine: [''],
      secteur: [''],
      consentement: [false, [Validators.requiredTrue]],
      // Honeypot : invisible, doit rester vide.
      website: [''],
    },
    { validators: auMoinsUnContact },
  );

  /** Symptômes regroupés par « groupe » pour l'affichage en blocs. */
  readonly groupes = computed(() => {
    const parGroupe = new Map<string, SymptomeDiagnostic[]>();
    for (const s of this.arbre().symptomes) {
      const liste = parGroupe.get(s.groupe) ?? [];
      liste.push(s);
      parGroupe.set(s.groupe, liste);
    }
    return [...parGroupe.entries()].map(([nom, symptomes]) => ({ nom, symptomes }));
  });

  /** Numéro d'étape courant (barre de progression : 1 → 4). */
  readonly numeroEtape = computed(() => {
    switch (this.etape()) {
      case 'symptome':
        return 1;
      case 'questions':
        return 2;
      case 'contact':
        return 3;
      case 'resultat':
        return 4;
      default:
        return 0;
    }
  });

  /** Toutes les questions du symptôme ont-elles une réponse ? */
  readonly peutContinuer = computed(() => {
    const s = this.symptomeChoisi();
    if (!s) return false;
    if (s.champLibre) return true;
    const r = this.reponses();
    return s.questions.every((q) => !!r[q.id]);
  });

  /** Résultat résolu. */
  readonly resultat = computed<DiagnosticResolu | null>(() => {
    const s = this.symptomeChoisi();
    if (!s) return null;
    return this.diag.resoudre(s, this.reponses());
  });

  /** Carte du service recommandé. */
  readonly serviceRecommande = computed<Service | null>(() => {
    const r = this.resultat();
    if (!r) return null;
    return this.services().find((s) => s.id === r.serviceId) ?? null;
  });

  /** Lien WhatsApp pré-rempli avec le résumé du diagnostic. */
  readonly lienWhatsApp = computed(() => {
    const r = this.resultat();
    const s = this.settings();
    if (!r || !s) return '#';
    const service = this.serviceRecommande();
    const resume =
      `Bonjour GK SupportIT, j'ai fait le diagnostic gratuit en ligne :\n` +
      `• Problème : ${r.symptomeLibelle}\n` +
      `• Diagnostic : ${r.explication}\n` +
      (service ? `• Service conseillé : ${service.nom}\n` : '') +
      `• Estimation : ${r.prixEstime}\n\n` +
      `J'aimerais en parler.`;
    return lienWhatsApp(s.whatsappNumber, resume);
  });

  // --- Navigation ---

  commencer(): void {
    this.etape.set('symptome');
  }

  choisirSymptome(s: SymptomeDiagnostic): void {
    this.symptomeChoisi.set(s);
    this.reponses.set({});
    this.champLibre.set('');
    this.etape.set(s.questions.length || s.champLibre ? 'questions' : 'contact');
  }

  repondre(questionId: string, valeur: string): void {
    this.reponses.update((r) => ({ ...r, [questionId]: valeur }));
  }

  /** Depuis les précisions → écran coordonnées. */
  continuer(): void {
    if (!this.peutContinuer()) return;
    this.intentionIntervention.set(false);
    this.etape.set('contact');
  }

  /** Voir le résultat SANS laisser de coordonnées (rien n'est enregistré). */
  voirSansCoordonnees(): void {
    this.etape.set('resultat');
  }

  /** Soumet les coordonnées + consentement, enregistre puis affiche le résultat. */
  soumettreContact(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const r = this.resultat();
    if (!r) return;

    this.envoi.set(true);
    const v = this.form.getRawValue();
    const s = this.symptomeChoisi();
    const statut = this.intentionIntervention() ? 'nouvelle-demande' : 'prospect';
    const payload: DiagnosticSubmission = {
      nom: v.nom,
      telephone: v.telephone,
      email: v.email,
      secteur: v.secteur,
      typeMachine: v.typeMachine,
      symptomeChoisi: r.symptomeLibelle,
      reponses: this.reponsesLisibles(s),
      panneIdentifiee: r.panneId,
      serviceRecommande: this.serviceRecommande()?.nom ?? '',
      prixEstime: r.prixEstime,
      gravite: r.gravite,
      explication: r.explication,
      consentement: v.consentement,
      statut,
      website: v.website,
    };

    this.content.submitDiagnostic(payload).subscribe((res) => {
      this.envoi.set(false);
      if (res.ok && res.id) this.demandeId.set(res.id);
      if (this.intentionIntervention()) this.interventionConfirmee.set(res.ok);
      this.etape.set('resultat');
    });
  }

  /** Bouton « Demander une intervention » depuis le résultat. */
  demanderIntervention(): void {
    const id = this.demandeId();
    if (id) {
      // Prospect déjà enregistré → promotion en nouvelle-demande.
      this.envoi.set(true);
      this.content.demanderIntervention(id).subscribe((res) => {
        this.envoi.set(false);
        this.interventionConfirmee.set(res.ok);
      });
    } else {
      // Aucune coordonnée encore → on demande les coordonnées (enregistrement direct).
      this.intentionIntervention.set(true);
      this.etape.set('contact');
    }
  }

  /** Avant d'ouvrir WhatsApp : promeut le prospect en nouvelle-demande (best-effort). */
  promouvoirSiBesoin(): void {
    const id = this.demandeId();
    if (id && !this.interventionConfirmee()) {
      this.content.demanderIntervention(id).subscribe((res) => {
        if (res.ok) this.interventionConfirmee.set(true);
      });
    }
  }

  retour(): void {
    const s = this.symptomeChoisi();
    const aPrecisions = !!(s && (s.questions.length || s.champLibre));
    switch (this.etape()) {
      case 'questions':
        this.etape.set('symptome');
        break;
      case 'contact':
        this.etape.set(aPrecisions ? 'questions' : 'symptome');
        break;
      case 'resultat':
        this.etape.set('contact');
        break;
      case 'symptome':
        this.etape.set('accueil');
        break;
    }
  }

  recommencer(): void {
    this.symptomeChoisi.set(null);
    this.reponses.set({});
    this.champLibre.set('');
    this.demandeId.set(null);
    this.intentionIntervention.set(false);
    this.interventionConfirmee.set(false);
    this.form.reset();
    this.etape.set('symptome');
  }

  /** Indique si un champ du formulaire est en erreur ET a été touché. */
  enErreur(champ: string): boolean {
    const c = this.form.get(champ);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  /** Reconstruit les réponses en clair (question → libellé choisi) pour l'admin. */
  private reponsesLisibles(s: SymptomeDiagnostic | null): { question: string; reponse: string }[] {
    if (!s) return [];
    if (s.champLibre) {
      const t = this.champLibre().trim();
      return t ? [{ question: 'Description', reponse: t }] : [];
    }
    const r = this.reponses();
    return s.questions
      .filter((q) => r[q.id])
      .map((q) => ({
        question: q.libelle,
        reponse: q.options.find((o) => o.valeur === r[q.id])?.label ?? r[q.id],
      }));
  }
}
