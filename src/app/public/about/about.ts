import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';

/**
 * Page « À propos » : histoire de GK SupportIT, engagement de confiance,
 * et zone de service (avec supplément hors zone).
 */
@Component({
  selector: 'gk-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class AboutComponent {
  private content = inject(ContentService);
  readonly settings = toSignal(this.content.getSettings());
}
