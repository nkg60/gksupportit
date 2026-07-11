import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Service } from '../../core/models/service.model';
import { lienWhatsApp, messageService } from '../../core/utils/whatsapp.util';

/**
 * Carte d'un service affichée dans la grille.
 * Le bouton « Choisir ce service » ouvre WhatsApp avec un message pré-rempli
 * contenant le nom du service ; le numéro provient des paramètres (jamais en dur).
 */
@Component({
  selector: 'gk-service-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss',
})
export class ServiceCardComponent {
  /** Le service à afficher. */
  readonly service = input.required<Service>();
  /** Numéro WhatsApp (chiffres) issu des paramètres du site. */
  readonly whatsappNumber = input.required<string>();

  /**
   * URL de l'affiche :
   *  - commence par http ou / (ex. /api/image/...) -> utilisée telle quelle ;
   *  - sinon = nom de fichier d'affiche locale dans /assets/posters.
   */
  readonly imageUrl = computed(() => {
    const img = this.service().image;
    return img.startsWith('http') || img.startsWith('/') ? img : `/assets/posters/${img}`;
  });

  /** Lien WhatsApp pré-rempli pour ce service. */
  readonly lien = computed(() =>
    lienWhatsApp(this.whatsappNumber(), messageService(this.service().nom)),
  );
}
