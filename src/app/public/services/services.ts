import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { ServiceCardComponent } from '../../shared/service-card/service-card';

/**
 * Page Services : grille de toutes les offres actives.
 */
@Component({
  selector: 'gk-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ServiceCardComponent],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class ServicesComponent {
  private content = inject(ContentService);

  readonly settings = toSignal(this.content.getSettings());
  readonly services = toSignal(this.content.getServices(), { initialValue: [] });
}
