import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SessionDepannageComponent } from './session-depannage';
import { GuidePannesComponent } from './guide-pannes';
import { ReferenceDepannageComponent } from './reference-depannage';
import { DiagnosticEditorComponent } from './diagnostic-editor';
import { PanneDraftService } from '../services/panne-draft.service';

/**
 * Espace « Dépannage » : session guidée, gestion du guide des pannes (CRUD),
 * et aide-mémoire (outils + réflexes de sécurité). Trois onglets internes.
 */
@Component({
  selector: 'gk-admin-depannage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SessionDepannageComponent,
    GuidePannesComponent,
    ReferenceDepannageComponent,
    DiagnosticEditorComponent,
  ],
  template: `
    <div class="adm-head">
      <h1>Dépannage guidé</h1>
    </div>

    <div class="dep-tabs">
      <button type="button" [class.is-active]="onglet() === 'session'" (click)="onglet.set('session')">
        Session guidée
      </button>
      <button type="button" [class.is-active]="onglet() === 'guide'" (click)="onglet.set('guide')">
        Guide des pannes
      </button>
      <button type="button" [class.is-active]="onglet() === 'reference'" (click)="onglet.set('reference')">
        Aide-mémoire
      </button>
      <button type="button" [class.is-active]="onglet() === 'diagnostic'" (click)="onglet.set('diagnostic')">
        Diagnostic client
      </button>
    </div>

    @switch (onglet()) {
      @case ('session') { <gk-session-depannage /> }
      @case ('guide') { <gk-guide-pannes /> }
      @case ('reference') { <gk-reference-depannage /> }
      @case ('diagnostic') { <gk-diagnostic-editor /> }
    }
  `,
  styles: [
    `
      .dep-tabs {
        display: flex;
        gap: 0.5rem;
        border-bottom: 1px solid var(--gk-border);
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }
      .dep-tabs button {
        background: transparent;
        border: 0;
        border-bottom: 3px solid transparent;
        padding: 0.6rem 0.9rem;
        font-family: inherit;
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--gk-ink-soft);
        cursor: pointer;
      }
      .dep-tabs button.is-active {
        color: var(--gk-navy);
        border-bottom-color: var(--gk-amber);
      }
    `,
  ],
})
export class DepannageComponent {
  private draftSvc = inject(PanneDraftService);
  readonly onglet = signal<'session' | 'guide' | 'reference' | 'diagnostic'>('session');

  constructor() {
    // Arrivée depuis « Créer une panne à partir de ce cas » → onglet Guide.
    if (this.draftSvc.draft()) this.onglet.set('guide');
  }
}
