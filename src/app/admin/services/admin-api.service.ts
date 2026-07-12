import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SiteSettings } from '../../core/models/site-settings.model';

/**
 * Accès CRUD générique aux données admin (Netlify Function protégée par JWT).
 * L'intercepteur ajoute automatiquement le jeton d'authentification.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private readonly base = '/api/admin/data';

  /** Liste tous les éléments d'une clé (store). */
  list<T>(store: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.base}/${store}`);
  }

  /** Crée un élément (id généré côté serveur). */
  create<T>(store: string, item: Partial<T>): Observable<{ ok: boolean; item: T }> {
    return this.http.post<{ ok: boolean; item: T }>(`${this.base}/${store}`, item);
  }

  /** Met à jour un élément par id. */
  update<T>(store: string, id: string, item: Partial<T>): Observable<{ ok: boolean; item: T }> {
    return this.http.put<{ ok: boolean; item: T }>(`${this.base}/${store}/${id}`, item);
  }

  /** Supprime un élément par id. */
  remove(store: string, id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${store}/${id}`);
  }

  /** Lit un store « objet unique » (ex. settings, diagnostic-public). */
  getObject<T>(store: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${store}`);
  }

  /** Remplace un store « objet unique ». */
  putObject<T>(store: string, value: T): Observable<{ ok: boolean; item: T }> {
    return this.http.put<{ ok: boolean; item: T }>(`${this.base}/${store}`, value);
  }

  /** Lit les paramètres complets du site (inclut capitalDepart). */
  getSettings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(`${this.base}/settings`);
  }

  /** Remplace les paramètres du site. */
  putSettings(settings: SiteSettings): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/settings`, settings);
  }

  /** Téléverse une image (affiche) ; renvoie l'URL publique /api/image/:key. */
  uploadImage(payload: {
    filename: string;
    contentType: string;
    dataBase64: string;
  }): Observable<{ ok: boolean; url: string; key: string }> {
    return this.http.post<{ ok: boolean; url: string; key: string }>('/api/admin/upload', payload);
  }
}
