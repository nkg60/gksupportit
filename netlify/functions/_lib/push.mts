import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import { readJson, writeJson } from './blobs.mjs';

/**
 * Notifications push (Web Push / VAPID) vers l'admin.
 *
 * Les abonnements du navigateur admin sont stockés dans la clé Blobs
 * « push-subscriptions ». L'envoi est TOUJOURS best-effort : toute erreur est
 * avalée pour ne jamais empêcher l'enregistrement d'une demande. Les
 * abonnements expirés (404/410) sont purgés automatiquement.
 */

const CLE = 'push-subscriptions';

/** Un abonnement stocké (structure PushSubscription du navigateur). */
export type AbonnementPush = PushSubscription;

/** Charge/écrit le vapid ; renvoie false si la config est absente. */
function configurerVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:gksupportit@gmail.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

/** Contenu d'une notification (format attendu par le service worker Angular). */
export interface NotifPayload {
  title: string;
  body: string;
  /** Chemin admin à ouvrir au clic (ex. « /admin/demandes »). */
  url: string;
}

/**
 * Envoie une notification à tous les abonnements admin enregistrés.
 * Best-effort : n'émet jamais d'exception vers l'appelant.
 */
export async function notifierAdmin(payload: NotifPayload): Promise<void> {
  try {
    if (!configurerVapid()) return;
    const abonnements = await readJson<AbonnementPush[]>(CLE, []);
    if (abonnements.length === 0) return;

    // Format ngsw : la notification est affichée telle quelle par le worker,
    // et « onActionClick » gère l'ouverture de la bonne page admin au clic.
    const message = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [80, 40, 80],
        data: {
          onActionClick: {
            default: { operation: 'focusLastFocusedOrOpen', url: payload.url },
          },
        },
      },
    });

    const morts = new Set<string>();
    await Promise.all(
      abonnements.map(async (ab) => {
        try {
          await webpush.sendNotification(ab, message);
        } catch (e: unknown) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) morts.add(ab.endpoint);
        }
      }),
    );

    // Purge des abonnements expirés.
    if (morts.size > 0) {
      await writeJson(
        CLE,
        abonnements.filter((a) => !morts.has(a.endpoint)),
      );
    }
  } catch {
    // Silencieux : une notification ratée ne doit pas casser le flux principal.
  }
}
