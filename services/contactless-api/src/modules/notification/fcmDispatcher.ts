import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { resolveFirebaseAdminCredentials } from '../../config/firebase.config';
import { deactivateInvalidPushTokens } from './notification.repository';

export interface FcmMulticastPayload {
  title: string;
  body: string;
  link: string;
  data?: Record<string, string>;
  requireInteraction?: boolean;
}

export interface FcmDispatchSummary {
  sentCount: number;
  failedCount: number;
  deactivatedTokens: string[];
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

let loggedUnconfiguredOnce = false;

function getOrInitializeFirebaseApp(): App | null {
  const creds = resolveFirebaseAdminCredentials();
  if (!creds) {
    if (!loggedUnconfiguredOnce) {
      loggedUnconfiguredOnce = true;
      console.info(
        '[fcm] Firebase Admin credentials not configured; skipping push notification delivery.',
      );
    }
    return null;
  }

  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp({
    credential: cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
  });
}

export async function sendFcmMulticast(
  tokens: string[],
  payload: FcmMulticastPayload,
): Promise<FcmDispatchSummary> {
  const uniqueTokens = Array.from(
    new Set(tokens.map((t) => t.trim()).filter((t) => t.length > 0)),
  );
  if (uniqueTokens.length === 0) {
    return { sentCount: 0, failedCount: 0, deactivatedTokens: [] };
  }

  const app = getOrInitializeFirebaseApp();
  if (!app) {
    return { sentCount: 0, failedCount: 0, deactivatedTokens: [] };
  }

  try {
    const response = await getMessaging(app).sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...(payload.data ?? {}),
        title: payload.title,
        body: payload.body,
        link: payload.link,
      },
      webpush: {
        fcmOptions: {
          link: payload.link,
        },
        notification: {
          title: payload.title,
          body: payload.body,
          requireInteraction: Boolean(payload.requireInteraction),
        },
      },
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code && INVALID_TOKEN_ERROR_CODES.has(resp.error.code)) {
        invalidTokens.push(uniqueTokens[idx]);
      }
    });

    if (invalidTokens.length > 0) {
      await deactivateInvalidPushTokens(invalidTokens).catch((err) => {
        console.warn('[fcm] Failed to deactivate invalid push tokens:', err);
      });
    }

    return {
      sentCount: response.successCount,
      failedCount: response.failureCount,
      deactivatedTokens: invalidTokens,
    };
  } catch (err) {
    console.warn(
      `[fcm] Multicast push delivery error: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    );
    return {
      sentCount: 0,
      failedCount: uniqueTokens.length,
      deactivatedTokens: [],
    };
  }
}

export function resetFcmDispatcherLogStateForTest(): void {
  loggedUnconfiguredOnce = false;
}
