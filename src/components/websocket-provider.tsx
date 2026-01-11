"use client"

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useWebSocket, type DocumentWebSocketEvent } from '@/hooks/use-websocket'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface WebSocketContextType {
  isConnected: boolean
  socket: any
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

/**
 * Provider WebSocket global pour gérer les événements en temps réel
 * Affiche des notifications toast pour les événements importants
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const { socket, isConnected } = useWebSocket({
    onDocumentCreated: (data: DocumentWebSocketEvent) => {
      console.log('📄 [WebSocket] Document créé reçu:', data)
      
      // Afficher une notification toast
      toast({
        title: '📄 Nouveau document créé',
        description: `Le document ${data.documentNumber} a été créé${data.message ? `: ${data.message}` : ''}`,
        variant: 'default',
      })

      // Émettre un événement personnalisé pour mettre à jour les composants
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:created', { detail: data }))
      }
    },

    onDocumentSigned: (data: DocumentWebSocketEvent) => {
      console.log('✍️ [WebSocket] Document signé reçu:', data)
      
      toast({
        title: '✍️ Document signé',
        description: data.allSignersSigned 
          ? `Tous les signataires ont signé le document ${data.documentNumber}`
          : `${data.signerName || 'Un signataire'} a signé le document ${data.documentNumber}${data.message ? `: ${data.message}` : ''}`,
        variant: data.allSignersSigned ? 'default' : 'default',
      })

      // Émettre un événement personnalisé
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:signed', { detail: data }))
        // Émettre aussi un événement pour mettre à jour le dashboard
        window.dispatchEvent(new CustomEvent('dashboard:update', { detail: { type: 'signature', data } }))
      }
    },

    onDocumentUpdated: (data: DocumentWebSocketEvent) => {
      console.log('🔄 [WebSocket] Document mis à jour reçu:', data)
      
      // Mettre à jour via événement personnalisé (pas de toast pour les updates fréquents)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:updated', { detail: data }))
      }
    },

    onDocumentStatusChanged: (data: DocumentWebSocketEvent) => {
      console.log('📊 [WebSocket] Statut document changé reçu:', data)
      
      const statusLabels: Record<string, string> = {
        'DRAFT': 'Brouillon',
        'SUBMITTED': 'Soumis',
        'IN_PROGRESS': 'En cours',
        'SIGNED': 'Signé',
        'VALIDATED': 'Validé',
        'APPROVED': 'Approuvé',
        'CANCELLED': 'Annulé',
        'REJECTED': 'Rejeté',
      }

      toast({
        title: '📊 Statut document mis à jour',
        description: `Le document ${data.documentNumber} est maintenant ${statusLabels[data.status] || data.status}${data.message ? `: ${data.message}` : ''}`,
        variant: data.status === 'CANCELLED' || data.status === 'REJECTED' ? 'destructive' : 'default',
      })

      // Émettre un événement personnalisé pour mettre à jour le dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:status_changed', { detail: data }))
        window.dispatchEvent(new CustomEvent('dashboard:update', { detail: { type: 'status', data } }))
      }
    },

    onDocumentApproved: (data: DocumentWebSocketEvent) => {
      console.log('✅ [WebSocket] Document approuvé reçu:', data)
      
      toast({
        title: '✅ Document approuvé',
        description: `${data.approvedByName || 'Un approbateur'} a approuvé le document ${data.documentNumber}`,
        variant: 'default',
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:approved', { detail: data }))
        window.dispatchEvent(new CustomEvent('dashboard:update', { detail: { type: 'approval', data } }))
      }
    },

    onDocumentRejected: (data: DocumentWebSocketEvent) => {
      console.log('❌ [WebSocket] Document rejeté reçu:', data)
      
      toast({
        title: '❌ Document rejeté',
        description: `${data.rejectedByName || 'Un utilisateur'} a rejeté le document ${data.documentNumber}${data.reason ? `: ${data.reason}` : ''}`,
        variant: 'destructive',
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document:rejected', { detail: data }))
        window.dispatchEvent(new CustomEvent('dashboard:update', { detail: { type: 'rejection', data } }))
      }
    },
  })

  // Écouter les événements pour les types de documents, catégories et utilisateurs
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('⏳ [WebSocketProvider] Socket non connecté, attente de la connexion...')
      return
    }

    console.log('📡 [WebSocketProvider] Enregistrement des écouteurs pour document_types, categories, users')

    const handleDocumentTypeCreated = (data: any) => {
      console.log('📋 [WebSocketProvider] Type de document créé:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document_type:created', { detail: data }))
      }
    }

    const handleDocumentTypeUpdated = (data: any) => {
      console.log('📋 [WebSocketProvider] Type de document mis à jour:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document_type:updated', { detail: data }))
      }
    }

    const handleDocumentTypeDeleted = (data: any) => {
      console.log('📋 [WebSocketProvider] Type de document supprimé:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document_type:deleted', { detail: data }))
      }
    }

    const handleCategoryCreated = (data: any) => {
      console.log('🏷️ [WebSocketProvider] Catégorie créée:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('category:created', { detail: data }))
      }
    }

    const handleCategoryUpdated = (data: any) => {
      console.log('🏷️ [WebSocketProvider] Catégorie mise à jour:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('category:updated', { detail: data }))
      }
    }

    const handleCategoryDeleted = (data: any) => {
      console.log('🏷️ [WebSocketProvider] Catégorie supprimée:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('category:deleted', { detail: data }))
      }
    }

    const handleUserCreated = (data: any) => {
      console.log('👤 [WebSocketProvider] Utilisateur créé:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user:created', { detail: data }))
      }
    }

    const handleUserUpdated = (data: any) => {
      console.log('👤 [WebSocketProvider] Utilisateur mis à jour:', data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user:updated', { detail: data }))
      }
    }

    // S'abonner aux événements WebSocket
    socket.on('document_type:created', handleDocumentTypeCreated)
    socket.on('document_type:updated', handleDocumentTypeUpdated)
    socket.on('document_type:deleted', handleDocumentTypeDeleted)
    socket.on('category:created', handleCategoryCreated)
    socket.on('category:updated', handleCategoryUpdated)
    socket.on('category:deleted', handleCategoryDeleted)
    socket.on('user:created', handleUserCreated)
    socket.on('user:updated', handleUserUpdated)

    console.log('✅ [WebSocketProvider] Tous les écouteurs enregistrés')

    return () => {
      // Nettoyer les écouteurs
      if (socket) {
        socket.off('document_type:created', handleDocumentTypeCreated)
        socket.off('document_type:updated', handleDocumentTypeUpdated)
        socket.off('document_type:deleted', handleDocumentTypeDeleted)
        socket.off('category:created', handleCategoryCreated)
        socket.off('category:updated', handleCategoryUpdated)
        socket.off('category:deleted', handleCategoryDeleted)
        socket.off('user:created', handleUserCreated)
        socket.off('user:updated', handleUserUpdated)
        console.log('🧹 [WebSocketProvider] Écouteurs nettoyés')
      }
    }
  }, [socket, isConnected])

  return (
    <WebSocketContext.Provider value={{ isConnected, socket }}>
      {children}
    </WebSocketContext.Provider>
  )
}
