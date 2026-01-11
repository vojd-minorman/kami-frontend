'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'

interface PushSubscription extends PushEventSubscription {
  id?: string
  isActive?: boolean
}

interface PushEventSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface UsePushNotificationsReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  vapidPublicKey: string | null
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  test: () => Promise<void>
}

/**
 * Hook React pour gérer les notifications push natives du navigateur
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Vérifier si les notifications push sont supportées
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkSupport = async () => {
      try {
        // Vérifier si le navigateur supporte les service workers et les notifications push
        if (
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window
        ) {
          setIsSupported(true)

          // Enregistrer le service worker
          try {
            const reg = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
            })
            
            swRegistrationRef.current = reg
            setRegistration(reg)
            console.log('✅ [PushNotifications] Service Worker enregistré:', reg.scope)

            // Vérifier si l'utilisateur est déjà abonné
            const subscription = await reg.pushManager.getSubscription()
            setIsSubscribed(!!subscription)

            // Charger la clé publique VAPID
            try {
              const response = await api.getVapidPublicKey()
              setVapidPublicKey(response.publicKey)
            } catch (err: any) {
              console.error('❌ [PushNotifications] Erreur lors de la récupération de la clé VAPID:', err)
              setError('Impossible de récupérer la clé publique VAPID')
            }
          } catch (err: any) {
            console.error('❌ [PushNotifications] Erreur lors de l\'enregistrement du Service Worker:', err)
            setError('Impossible d\'enregistrer le Service Worker')
          }
        } else {
          setIsSupported(false)
          setError('Les notifications push ne sont pas supportées par votre navigateur')
        }
      } catch (err: any) {
        console.error('❌ [PushNotifications] Erreur lors de la vérification du support:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    checkSupport()
  }, [])

  // Vérifier l'état de l'abonnement quand l'utilisateur change
  useEffect(() => {
    if (!user || !registration) return

    const checkSubscription = async () => {
      try {
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (err: any) {
        console.error('❌ [PushNotifications] Erreur lors de la vérification de l\'abonnement:', err)
      }
    }

    checkSubscription()
  }, [user, registration])

  /**
   * S'abonner aux notifications push
   */
  const subscribe = useCallback(async () => {
    if (!user || !registration || !vapidPublicKey) {
      throw new Error('Service Worker ou clé VAPID non disponible')
    }

    try {
      setIsLoading(true)
      setError(null)

      // Demander la permission de notification
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        throw new Error('Permission de notification refusée')
      }

      // Convertir la clé publique VAPID de base64url en Uint8Array
      const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
      }

      // Vérifier si déjà abonné
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        // Créer une nouvelle subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      // Convertir les clés ArrayBuffer en base64url (format requis par le backend)
      const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        // Convertir en base64 puis en base64url
        const base64 = btoa(binary)
        // Convertir base64 en base64url (remplacer + par -, / par _, et supprimer =)
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      }

      const p256dhKey = subscription.getKey('p256dh')!
      const authKey = subscription.getKey('auth')!

      // Enregistrer la subscription sur le backend
      console.log('📱 [PushNotifications] Enregistrement de la subscription sur le backend...', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        hasP256dh: !!p256dhKey,
        hasAuth: !!authKey,
      })

      const response = await api.subscribeToPush({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64Url(p256dhKey),
            auth: arrayBufferToBase64Url(authKey),
          },
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        deviceInfo: typeof navigator !== 'undefined' ? `${navigator.platform} - ${navigator.userAgent}` : null,
      })

      console.log('✅ [PushNotifications] Subscription enregistrée avec succès:', response.data?.id)

      // Vérifier à nouveau l'état de la subscription après l'enregistrement
      const updatedSubscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!updatedSubscription)

      if (updatedSubscription) {
        console.log('✅ [PushNotifications] Abonnement confirmé - Subscription active')
      } else {
        console.warn('⚠️ [PushNotifications] Abonnement enregistré mais subscription non retrouvée')
      }
    } catch (err: any) {
      console.error('❌ [PushNotifications] Erreur lors de l\'abonnement:', err)
      setError(err.message || 'Erreur lors de l\'abonnement aux notifications push')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user, registration, vapidPublicKey])

  /**
   * Se désabonner des notifications push
   */
  const unsubscribe = useCallback(async () => {
    if (!user || !registration) {
      throw new Error('Service Worker non disponible')
    }

    try {
      setIsLoading(true)
      setError(null)

      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        // Se désabonner du push manager
        await subscription.unsubscribe()

        // Récupérer toutes les subscriptions de l'utilisateur et les désactiver
        try {
          const subscriptions = await api.getPushSubscriptions()
          for (const sub of subscriptions.data) {
            if (sub.endpoint === subscription.endpoint) {
              await api.unsubscribeFromPush(sub.id)
            }
          }
        } catch (err: any) {
          console.error('⚠️ [PushNotifications] Erreur lors de la désactivation sur le backend:', err)
          // Continuer même si le backend échoue
        }
      }

      setIsSubscribed(false)
      console.log('✅ [PushNotifications] Désabonnement réussi')
    } catch (err: any) {
      console.error('❌ [PushNotifications] Erreur lors du désabonnement:', err)
      setError(err.message || 'Erreur lors du désabonnement')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user, registration])

  /**
   * Tester l'envoi d'une notification push
   */
  const test = useCallback(async () => {
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }

    // Vérifier d'abord si l'utilisateur est abonné
    if (!isSubscribed) {
      throw new Error('Vous devez d\'abord activer les notifications push. Cliquez sur "Activer les notifications push" pour continuer.')
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await api.testPushNotification()
      console.log('✅ [PushNotifications] Notification de test envoyée', response)
      
      // Afficher un message d'information si aucune notification n'a été envoyée
      if (response.result && response.result.sent === 0) {
        throw new Error('Aucune subscription push active. Veuillez d\'abord activer les notifications push depuis les paramètres.')
      }
    } catch (err: any) {
      console.error('❌ [PushNotifications] Erreur lors du test:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'envoi de la notification de test'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [user, isSubscribed])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    vapidPublicKey,
    error,
    subscribe,
    unsubscribe,
    test,
  }
}
