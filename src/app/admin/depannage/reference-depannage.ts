import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  CE_QUE_JE_NE_FAIS_PAS,
  OUTILS_PAR_SYMPTOME,
  REFLEXES_SECURITE,
} from '../../core/data/reference-depannage';

/**
 * Aide-mémoire consultable : outil par symptôme, réflexes de sécurité,
 * et « Ce que je ne fais pas ».
 */
@Component({
  selector: 'gk-reference-depannage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reference-depannage.html',
  styleUrl: './reference-depannage.scss',
})
export class ReferenceDepannageComponent {
  readonly outils = OUTILS_PAR_SYMPTOME;
  readonly securite = REFLEXES_SECURITE;
  readonly limites = CE_QUE_JE_NE_FAIS_PAS;
}
