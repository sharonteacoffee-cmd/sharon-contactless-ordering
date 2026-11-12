/* eslint-disable no-undef */
/**
 * Standard Web Push Service Worker for Sharon Customer Ordering PWA.
 * Zero external CDN importScripts and zero hardcoded Firebase credentials.
 */

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: 'Sharon Tea & Coffee',
        body: event.data.text(),
      },
    };
  }

  const fcmMsg = payload.FCM_MSG || {};
  const notificationData = payload.notification || fcmMsg.notification || {};
  const customData = payload.data || fcmMsg.data || {};

  const title =
    notificationData.title || customData.title || 'Sharon Tea & Coffee — Order Update';
  const body =
    notificationData.body ||
    customData.body ||
    'There is a live update on your Sharon order.';
  const targetLink =
    notificationData.click_action ||
    payload.fcmOptions?.link ||
    customData.link ||
    '/';

  const options = {
    body,
    icon: notificationData.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: customData.orderBusinessId || 'sharon-customer-order-alert',
    data: {
      ...customData,
      link: targetLink,
      FCM_MSG: {
        notification: {
          ...notificationData,
          click_action: targetLink,
        },
        data: customData,
      },
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const rawTargetUrl =
    data?.FCM_MSG?.notification?.click_action || data?.link || '/';
  const resolvedUrl = new URL(rawTargetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client && typeof client.navigate === 'function') {
              return client.navigate(resolvedUrl).then(() => client.focus());
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(resolvedUrl);
      }),
  );
});
