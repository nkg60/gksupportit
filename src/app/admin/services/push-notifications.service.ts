import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

/**
 * Notifications push de l'admin (Web Push / VAPID).
 *
 * L'admin s'abonne depuis son navigateur (idéalement la PWA installée sur son
 * téléphone) ; l'abonnement est stocké côté serveur. Les fonctions Netlify qui
 * créent une demande envoient alors une notification, même app fermée.
 *
 * Ne fonctionne qu'avec le service worker actif (build de production servi en
 * HTTPS ou sur localhost) — indisponible sous `ng serve`.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Le navigateur + le service worker supportent-ils le push ? */
  readonly supporte = this.swPush.isEnabled && 'Notification' in window;
  /** L'admin est-il abonné sur cet appareil ? */
  readonly active = signal(false);
  /** Opération en cours (abonnement/désabonnement). */
  readonly occupe = signal(false);
  /** Message d'état affiché à l'admin. */
  readonly message = signal('');

  constructor() {
    if (!this.supporte) return;
    // Reflète l'état d'abonnement réel de cet appareil au démarrage.
    firstValueFrom(this.swPush.subscription)
      .then((sub) => this.active.set(!!sub))
      .catch(() => {});
    // Clic sur une notification (app au premier plan) → ouvre la bonne page.
    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const url = notification.data?.onActionClick?.default?.url;
      if (url) this.router.navigateByUrl(url);
    });
  }

  /** Active ou désactive selon l'état courant. */
  async basculer(): Promise<void> {
    if (this.occupe()) return;
    await (this.active() ? this.desactiver() : this.activer());
  }

  private async activer(): Promise<void> {
    if (Notification.permission === 'denied') {
      this.message.set('Notifications bloquées pour ce site — réactivez-les dans les réglages du navigateur.');
      return;
    }
    this.occupe.set(true);
    this.message.set('');
    try {
      // Étape 1 — autorisation du navigateur (déclenchée par le clic).
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        this.message.set('Autorisation des notifications refusée.');
        return;
      }

      // Étape 2 — clé publique VAPID depuis le serveur.
      let key: string;
      try {
        const res = await firstValueFrom(
          this.http.get<{ ok: boolean; key: string }>('/api/admin/push/key'),
        );
        key = res?.key ?? '';
      } catch (e) {
        this.message.set(`Serveur injoignable pour la clé (${this.statut(e)}).`);
        return;
      }
      if (!key) {
        this.message.set('Clé VAPID absente côté serveur — vérifiez les variables VAPID_* sur Netlify.');
        return;
      }

      // Étape 3 — abonnement push auprès du navigateur.
      const sub = await this.creerAbonnement(key);
      if (!sub) return; // message déjà positionné par creerAbonnement()

      // Étape 4 — enregistrement de l'abonnement côté serveur.
      try {
        await firstValueFrom(this.http.post('/api/admin/push/subscribe', sub));
      } catch (e) {
        this.message.set(`Abonnement créé mais non enregistré (${this.statut(e)}).`);
        return;
      }

      this.active.set(true);
      this.message.set('Notifications activées sur cet appareil.');
    } finally {
      this.occupe.set(false);
    }
  }

  /**
   * Crée l'abonnement push du navigateur, ou null (avec message) en cas d'échec.
   * Gère le cas fréquent d'un abonnement résiduel créé avec une AUTRE clé VAPID
   * (ancienne tentative / clé régénérée) : on le retire puis on réessaie.
   */
  private async creerAbonnement(key: string): Promise<PushSubscription | null> {
    try {
      return await this.swPush.requestSubscription({ serverPublicKey: key });
    } catch (e) {
      if (e instanceof Error && e.name === 'InvalidStateError') {
        try {
          await this.swPush.unsubscribe();
          return await this.swPush.requestSubscription({ serverPublicKey: key });
        } catch {
          /* échec persistant → message générique ci-dessous */
        }
      }
      const nom = e instanceof Error ? e.name : 'inconnu';
      this.message.set(
        `Le navigateur n'a pas pu créer l'abonnement push (${nom}). ` +
          "Sur iPhone, l'app doit d'abord être installée sur l'écran d'accueil (iOS 16.4+) et ouverte depuis son icône.",
      );
      return null;
    }
  }

  /** Décrit brièvement une erreur HTTP (code + libellé) pour le message admin. */
  private statut(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'réseau/hors-ligne';
      if (e.status === 504) return 'délai dépassé (504)';
      return `HTTP ${e.status}`;
    }
    return 'erreur inconnue';
  }

  private async desactiver(): Promise<void> {
    this.occupe.set(true);
    this.message.set('');
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      if (sub) {
        await firstValueFrom(
          this.http.post('/api/admin/push/unsubscribe', { endpoint: sub.endpoint }),
        );
        await this.swPush.unsubscribe();
      }
      this.active.set(false);
      this.message.set('Notifications désactivées sur cet appareil.');
    } catch {
      this.message.set('Impossible de désactiver les notifications.');
    } finally {
      this.occupe.set(false);
    }
  }
}
