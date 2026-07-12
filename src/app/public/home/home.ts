import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { ServiceCardComponent } from '../../shared/service-card/service-card';
import { RevealDirective } from '../../shared/reveal/reveal.directive';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';

/**
 * Page d'accueil : hero + arguments clés + services phares +
 * « comment ça marche » + section confiance.
 */
@Component({
  selector: 'gk-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, ServiceCardComponent, RevealDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private content = inject(ContentService);

  readonly settings = toSignal(this.content.getSettings());
  readonly services = toSignal(this.content.getServices(), { initialValue: [] });

  /** Titres du hero qui défilent (3 slogans, clés i18n hero.title1..3). */
  readonly titres = [0, 1, 2] as const;
  /** Index du titre actif (rotation automatique). */
  readonly titreActif = signal(0);

  constructor() {
    // Rotation douce des 3 titres toutes les 4 s ; arrêtée à la destruction.
    const timer = setInterval(() => {
      this.titreActif.update((i) => (i + 1) % this.titres.length);
    }, 4000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** Trois services mis en avant sur l'accueil (Migration SSD, Virus, Nettoyage). */
  readonly servicesPhares = computed(() => {
    const ids = ['migration-ssd', 'nettoyage-virus', 'nettoyage-interne'];
    const list = this.services();
    const phares = ids
      .map((id) => list.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    // Repli : si un id manque, on complète avec les premiers services.
    return phares.length ? phares : list.slice(0, 3);
  });

  /** Lien WhatsApp général pour le bouton principal du hero. */
  readonly lienContact = computed(() => {
    const s = this.settings();
    if (!s) return '#';
    return lienWhatsApp(
      s.whatsappNumber,
      "Bonjour GK SupportIT, j'aimerais un dépannage informatique à domicile.",
    );
  });
}
