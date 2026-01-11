/* eslint-disable no-restricted-globals */
// Service Worker pour gérer les notifications push natives du navigateur

const CACHE_NAME = 'kami-operation-v1'
const NOTIFICATION_ICON = '/icon.png'
const NOTIFICATION_BADGE = '/icon.png'

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('🔧 [Service Worker] Installation...')
  self.skipWaiting() // Activer immédiatement le nouveau service worker
})

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('✅ [Service Worker] Activation...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    })
  )
  return self.clients.claim() // Prendre contrôle de toutes les pages
})

// Réception d'une notification push
self.addEventListener('push', (event) => {
  console.log('📬 [Service Worker] Notification push reçue:', event)

  let notificationData = {
    title: 'Notification',
    body: 'Vous avez une nouvelle notification',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    data: {},
    tag: 'notification',
    requireInteraction: false,
    silent: false,
  }

  // Essayer de parser les données de la notification
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || NOTIFICATION_ICON,
        badge: data.badge || NOTIFICATION_BADGE,
        image: data.image || undefined,
        data: data.data || {},
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        timestamp: data.timestamp || Date.now(),
      }
    } catch (error) {
      // Si les données ne sont pas en JSON, utiliser comme texte
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  // Afficher la notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      timestamp: notificationData.timestamp,
      vibrate: [200, 100, 200], // Vibration pour les appareils mobiles
      actions: notificationData.data?.link
        ? [
            {
              action: 'open',
              title: 'Ouvrir',
              icon: '/icon.png',
            },
            {
              action: 'close',
              title: 'Fermer',
            },
          ]
        : [
            {
              action: 'close',
              title: 'Fermer',
            },
          ],
    })
  )
})

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [Service Worker] Notification cliquée:', event)

  event.notification.close() // Fermer la notification

  const notificationData = event.notification.data || {}
  const link = notificationData.link || notificationData.url || '/dashboard'

  // Gérer les actions
  if (event.action === 'open' || !event.action) {
    // Ouvrir ou se concentrer sur la page correspondante
    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Si une fenêtre est déjà ouverte, la mettre en avant
          for (const client of clientList) {
            if (client.url.includes(link) && 'focus' in client) {
              return client.focus()
            }
          }
          // Sinon, ouvrir une nouvelle fenêtre
          if (clients.openWindow) {
            const fullUrl = new URL(link, self.location.origin).href
            return clients.openWindow(fullUrl)
          }
        })
    )
  } else if (event.action === 'close') {
    // Juste fermer la notification (déjà fait)
    console.log('❌ [Service Worker] Notification fermée')
  }
})

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('❌ [Service Worker] Erreur:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [Service Worker] Promise rejetée non gérée:', event.reason)
})
