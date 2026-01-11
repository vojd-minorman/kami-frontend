'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

export function PushNotificationsSettings() {
  const { toast } = useToast()
  const {
    isSupported,
    isSubscribed,
    isLoading,
    vapidPublicKey,
    error,
    subscribe,
    unsubscribe,
    test,
  } = usePushNotifications()

  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true)
      await subscribe()
      toast({
        title: 'Succès',
        description: 'Les notifications push ont été activées avec succès !',
      })
    } catch (err: any) {
      console.error('Error subscribing to push notifications:', err)
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible d\'activer les notifications push',
        variant: 'destructive',
      })
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleUnsubscribe = async () => {
    try {
      setIsUnsubscribing(true)
      await unsubscribe()
      toast({
        title: 'Succès',
        description: 'Les notifications push ont été désactivées',
      })
    } catch (err: any) {
      console.error('Error unsubscribing from push notifications:', err)
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de désactiver les notifications push',
        variant: 'destructive',
      })
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const handleTest = async () => {
    try {
      setIsTesting(true)
      await test()
      toast({
        title: 'Succès',
        description: 'Une notification de test a été envoyée. Vérifiez votre appareil !',
      })
    } catch (err: any) {
      console.error('Error testing push notification:', err)
      const errorMessage = err.message || err.response?.data?.message || 'Impossible d\'envoyer la notification de test'
      
      // Vérifier si c'est une erreur de "pas de subscription"
      if (errorMessage.includes('Aucune subscription') || errorMessage.includes('subscription') || errorMessage.includes('activé')) {
        toast({
          title: 'Notifications push non activées',
          description: 'Vous devez d\'abord activer les notifications push en cliquant sur "Activer les notifications push" ci-dessus.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications push
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Recevez des notifications même lorsque l'application n'est pas ouverte
            </CardDescription>
          </div>
          {isSubscribed ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Activé
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Désactivé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statut du support */}
          {!isSupported ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-500 mb-1">
                  Notifications push non supportées
                </p>
                <p className="text-xs text-muted-foreground">
                  Votre navigateur ne supporte pas les notifications push natives. 
                  Veuillez utiliser un navigateur moderne (Chrome, Firefox, Edge, Safari 16.4+).
                </p>
              </div>
            </div>
          ) : !vapidPublicKey ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-500 mb-1">
                  Clés VAPID non configurées
                </p>
                <p className="text-xs text-muted-foreground">
                  Les clés VAPID ne sont pas configurées côté serveur. Contactez l'administrateur.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500 mb-1">Erreur</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Les notifications push vous permettent de recevoir des notifications même lorsque 
                  l'application n'est pas ouverte dans votre navigateur.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs ml-2">
                  <li>Recevez des notifications en temps réel pour tous les événements importants</li>
                  <li>Les notifications apparaissent même si l'application est en arrière-plan</li>
                  <li>Cliquez sur une notification pour ouvrir l'application directement sur la page concernée</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!isSubscribed ? (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isLoading || isSubscribing || !isSupported || !vapidPublicKey}
                    className="flex-1"
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activation...
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Activer les notifications push
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleUnsubscribe}
                      disabled={isLoading || isUnsubscribing}
                      className="flex-1"
                    >
                      {isUnsubscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Désactivation...
                        </>
                      ) : (
                        <>
                          <BellOff className="mr-2 h-4 w-4" />
                          Désactiver les notifications push
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={isLoading || isTesting || !isSubscribed}
                      className="flex-1"
                      title={!isSubscribed ? 'Activez d\'abord les notifications push pour tester' : 'Tester l\'envoi d\'une notification push'}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Tester les notifications
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Informations supplémentaires */}
              {isSubscribed ? (
                <>
                  <Separator />
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-500 mb-1">
                        Notifications push activées
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vous recevrez désormais des notifications push pour tous les événements importants 
                        (création de documents, signatures, changements de statut, etc.). 
                        Vous pouvez tester les notifications en cliquant sur le bouton "Tester les notifications" ci-dessus.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-500 mb-1">
                        ⚠️ Notifications push non activées
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Pour recevoir des notifications push et tester les notifications, vous devez d'abord :
                      </p>
                      <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                        <li>Cliquer sur "Activer les notifications push" ci-dessus</li>
                        <li>Autoriser les notifications dans la popup de votre navigateur</li>
                        <li>Une fois activé, vous pourrez tester les notifications</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
