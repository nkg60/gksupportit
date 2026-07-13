import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
      const { ok, key } = await firstValueFrom(
        this.http.get<{ ok: boolean; key: string }>('/api/admin/push/key'),
      );
      if (!ok || !key) {
        this.message.set('Notifications non configurées côté serveur (clé VAPID manquante).');
        return;
      }
      const sub = await this.swPush.requestSubscription({ serverPublicKey: key });
      await firstValueFrom(this.http.post('/api/admin/push/subscribe', sub));
      this.active.set(true);
      this.message.set('Notifications activées sur cet appareil.');
    } catch {
      this.message.set("Impossible d'activer les notifications (permission refusée ?).");
    } finally {
      this.occupe.set(false);
    }
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
