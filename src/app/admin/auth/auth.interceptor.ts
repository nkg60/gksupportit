import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Intercepteur HTTP admin :
 *  - ajoute l'en-tête « Authorization: Bearer <jeton> » aux appels /api/admin/*
 *    (sauf la connexion) ;
 *  - déconnecte automatiquement en cas de réponse 401 (jeton invalide/expiré).
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const estAppelAdmin = req.url.startsWith('/api/admin/') && !req.url.endsWith('/login');
  if (estAppelAdmin) {
    const token = auth.token();
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && estAppelAdmin) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
