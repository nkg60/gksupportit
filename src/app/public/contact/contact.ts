import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { RevealDirective } from '../../shared/reveal/reveal.directive';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/**
 * Page Contact : WhatsApp (mis en avant), courriel, horaires, zone.
 */
@Component({
  selector: 'gk-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RevealDirective],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  private content = inject(ContentService);
  readonly settings = toSignal(this.content.getSettings());

  readonly lienContact = computed(() => {
    const s = this.settings();
    if (!s) return '#';
    return lienWhatsApp(s.whatsappNumber, 'Bonjour GK SupportIT, ');
  });
}
