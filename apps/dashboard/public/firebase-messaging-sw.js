/* eslint-disable no-restricted-globals */
/**
 * Sharon Operations & KDS Portal — Web Push Service Worker.
 * Uses standard Web Push events without external CDN importScripts or hardcoded secrets.
 */

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Sharon KDS Alert', body: event.data.text() } };
  }

  const fcmNotification = payload.notification || payload.fcmOptions || {};
  const data = payload.data || {};
  const fcmMsgNotification =
    payload.FCM_MSG && payload.FCM_MSG.notification ? payload.FCM_MSG.notification : {};

  const title =
    fcmNotification.title ||
    fcmMsgNotification.title ||
    data.title ||
    'New Sharon KDS Order';
  const body =
    fcmNotification.body ||
    fcmMsgNotification.body ||
    data.body ||
    'A new contactless order requires attention on the KDS board.';
  const targetLink =
    data.link ||
    fcmNotification.click_action ||
    fcmMsgNotification.click_action ||
    '/kds';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      requireInteraction: true,
      tag: data.orderBusinessId ? `sharon-kds-${data.orderBusinessId}` : 'sharon-kds-alert',
      renotify: true,
      data: {
        link: targetLink,
        orderBusinessId: data.orderBusinessId || '',
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetPath = notificationData.link || '/kds';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then(() => client.focus());
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
