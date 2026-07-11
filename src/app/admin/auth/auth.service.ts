import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

/**
 * Authentification de l'espace admin.
 * Le jeton JWT est conservé UNIQUEMENT en mémoire (pas de localStorage) pour
 * limiter le vol par XSS : un rechargement de page impose donc une reconnexion.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Jeton courant (null si déconnecté). */
  private readonly _token = signal<string | null>(null);
  /** Timestamp (ms) d'expiration du jeton. */
  private expiration = 0;

  /** Vrai si un jeton est présent et non expiré. */
  readonly estConnecte = computed(() => this._token() !== null && Date.now() < this.expiration);

  /** Jeton brut (pour l'intercepteur). */
  token(): string | null {
    return Date.now() < this.expiration ? this._token() : null;
  }

  /** Tente la connexion avec le mot de passe admin. */
  login(password: string): Observable<boolean> {
    return this.http
      .post<{ ok: boolean; token?: string; expiresIn?: number }>('/api/admin/login', { password })
      .pipe(
        map((r) => {
          if (r.ok && r.token) {
            this._token.set(r.token);
            this.expiration = Date.now() + (r.expiresIn ?? 0) * 1000;
            return true;
          }
          return false;
        }),
        catchError(() => of(false)),
      );
  }

  /** Déconnexion : efface le jeton et renvoie vers la page de connexion. */
  logout(): void {
    this._token.set(null);
    this.expiration = 0;
    this.router.navigate(['/admin/login']);
  }
}
