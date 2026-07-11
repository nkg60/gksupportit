import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Garde des routes /admin/** : bloque l'accès si l'admin n'est pas connecté
 * (ou si le jeton a expiré) et redirige vers la page de connexion.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estConnecte() ? true : router.createUrlTree(['/admin/login']);
};
