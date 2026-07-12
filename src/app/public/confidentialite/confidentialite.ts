import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';

/**
 * Politique de confidentialité — page publique simple (une page, en français).
 * Explique quelles données sont collectées, pourquoi, qu'elles ne sont ni
 * vendues ni partagées, et comment en demander la suppression.
 */
@Component({
  selector: 'gk-confidentialite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './confidentialite.html',
  styleUrl: './confidentialite.scss',
})
export class ConfidentialiteComponent {
  private content = inject(ContentService);
  readonly settings = toSignal(this.content.getSettings());
}
