import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { Service } from '../models/service.model';
import { SiteSettings } from '../models/site-settings.model';
import { Demande } from '../models/demande.model';
import { Carte } from '../models/carte.model';
import { SERVICES_SEED } from '../data/services.seed';
import { SETTINGS_SEED } from '../data/settings.seed';

/**
 * Service d'accès au contenu public (services, paramètres, demandes).
 *
 * Depuis la Phase 2, les données proviennent des Netlify Functions
 * (lecture/écriture dans Netlify Blobs) via les endpoints /api/*.
 *
 * Repli (fallback) : si l'API n'est pas joignable — typiquement en lançant
 * `ng serve` seul, sans `netlify dev` — on retombe sur les seeds locaux.
 * Le site reste ainsi utilisable en développement front pur.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);

  /** Services actifs, triés par ordre d'affichage. */
  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>('/api/services').pipe(
      catchError(() => of(this.servicesDeRepli())),
    );
  }

  /** Paramètres publics du site. */
  getSettings(): Observable<SiteSettings> {
    return this.http
      .get<SiteSettings>('/api/settings')
      .pipe(catchError(() => of(SETTINGS_SEED)));
  }

  /**
   * Enregistre une demande entrante (prospect) via l'API.
   * En cas d'échec réseau, on renvoie tout de même { ok: true } pour ne pas
   * bloquer l'utilisateur : le relais WhatsApp (avec résumé) prend le relais.
   */
  submitDemande(demande: Demande): Observable<{ ok: boolean; id?: string }> {
    return this.http.post<{ ok: boolean; id?: string }>('/api/demande', demande).pipe(
      catchError(() => {
        console.warn('[GK SupportIT] Demande non enregistrée (API indisponible) — relais WhatsApp.');
        return of({ ok: true });
      }),
    );
  }

  /** Lit une carte de visite publique par son slug. */
  getCarte(slug: string): Observable<Carte> {
    return this.http.get<Carte>(`/api/carte/${slug}`);
  }

  /** Repli local : seeds filtrés/triés comme le ferait l'API. */
  private servicesDeRepli(): Service[] {
    return SERVICES_SEED.filter((s) => s.actif).sort((a, b) => a.ordre - b.ordre);
  }
}
