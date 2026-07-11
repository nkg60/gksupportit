import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Composant racine : ne contient qu'un point de sortie de routeur.
 * La mise en page publique (en-tête/pied) et la mise en page admin sont
 * portées par leurs routes respectives.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
