"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './use-auth'

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3333'

// Types pour les événements WebSocket liés aux documents
export interface DocumentWebSocketEvent {
  documentId: string
  documentNumber: string
  documentTypeName?: string | null
  status: string
  previousStatus?: string
  createdBy?: string
  updatedBy?: string
  signerId?: string
  signerName?: string
  approvedBy?: string
  approvedByName?: string
  rejectedBy?: string
  rejectedByName?: string
  allSignersSigned?: boolean
  signature?: {
    id: string
    signedAt: string
    signatureMethod: string
  }
  reason?: string | null
  message?: string
}

export interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  subscribe: (event: string, handler: (data: any) => void) => void
  unsubscribe: (event: string, handler?: (data: any) => void) => void
}

/**
 * Hook pour gérer la connexion WebSocket et écouter les événements liés aux documents
 * Les handlers sont stockés dans une ref pour éviter les reconnexions à chaque render
 */
export function useWebSocket(
  handlers?: {
    onDocumentCreated?: (data: DocumentWebSocketEvent) => void
    onDocumentSigned?: (data: DocumentWebSocketEvent) => void
    onDocumentUpdated?: (data: DocumentWebSocketEvent) => void
    onDocumentStatusChanged?: (data: DocumentWebSocketEvent) => void
    onDocumentApproved?: (data: DocumentWebSocketEvent) => void
    onDocumentRejected?: (data: DocumentWebSocketEvent) => void
  }
): UseWebSocketReturn {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const handlersRef = useRef(handlers)

  // Mettre à jour la ref des handlers sans déclencher de reconnexion
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(() => {
    if (!user?.id) {
      console.log('[useWebSocket] Pas d\'utilisateur, connexion différée')
      return
    }

    if (socketRef.current?.connected) {
      console.log('[useWebSocket] Déjà connecté, mise à jour des handlers uniquement')
      // Si déjà connecté, mettre à jour les handlers seulement
      const socket = socketRef.current
      
      // Nettoyer les anciens handlers
      socket.off('document:created')
      socket.off('document:signed')
      socket.off('document:updated')
      socket.off('document:status_changed')
      socket.off('document:approved')
      socket.off('document:rejected')

      // Ajouter les nouveaux handlers
      if (handlersRef.current?.onDocumentCreated) {
        socket.on('document:created', handlersRef.current.onDocumentCreated)
      }
      if (handlersRef.current?.onDocumentSigned) {
        socket.on('document:signed', handlersRef.current.onDocumentSigned)
      }
      if (handlersRef.current?.onDocumentUpdated) {
        socket.on('document:updated', handlersRef.current.onDocumentUpdated)
      }
      if (handlersRef.current?.onDocumentStatusChanged) {
        socket.on('document:status_changed', handlersRef.current.onDocumentStatusChanged)
      }
      if (handlersRef.current?.onDocumentApproved) {
        socket.on('document:approved', handlersRef.current.onDocumentApproved)
      }
      if (handlersRef.current?.onDocumentRejected) {
        socket.on('document:rejected', handlersRef.current.onDocumentRejected)
      }
      return
    }

    console.log(`📡 [useWebSocket] Connexion avec userId: ${user.id}`)

    const socket = io(WS_URL, {
      auth: { userId: user.id },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    })

    socket.on('connect', () => {
      console.log(`✅ [useWebSocket] Connecté: ${socket.id}`)
      setIsConnected(true)
      
      // Enregistrer les gestionnaires d'événements après connexion
      if (handlersRef.current?.onDocumentCreated) {
        socket.on('document:created', handlersRef.current.onDocumentCreated)
        console.log('[useWebSocket] Écouteur enregistré pour: document:created')
      }
      if (handlersRef.current?.onDocumentSigned) {
        socket.on('document:signed', handlersRef.current.onDocumentSigned)
        console.log('[useWebSocket] Écouteur enregistré pour: document:signed')
      }
      if (handlersRef.current?.onDocumentUpdated) {
        socket.on('document:updated', handlersRef.current.onDocumentUpdated)
        console.log('[useWebSocket] Écouteur enregistré pour: document:updated')
      }
      if (handlersRef.current?.onDocumentStatusChanged) {
        socket.on('document:status_changed', handlersRef.current.onDocumentStatusChanged)
        console.log('[useWebSocket] Écouteur enregistré pour: document:status_changed')
      }
      if (handlersRef.current?.onDocumentApproved) {
        socket.on('document:approved', handlersRef.current.onDocumentApproved)
        console.log('[useWebSocket] Écouteur enregistré pour: document:approved')
      }
      if (handlersRef.current?.onDocumentRejected) {
        socket.on('document:rejected', handlersRef.current.onDocumentRejected)
        console.log('[useWebSocket] Écouteur enregistré pour: document:rejected')
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`❌ [useWebSocket] Déconnecté: ${reason}`)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('❌ [useWebSocket] Erreur de connexion:', error.message)
      setIsConnected(false)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 [useWebSocket] Reconnexion réussie (tentative ${attemptNumber})`)
      setIsConnected(true)
    })

    socketRef.current = socket
  }, [user?.id])

  // Fonction pour se déconnecter
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('📡 [useWebSocket] Déconnexion...')
      
      // Nettoyer tous les écouteurs
      socketRef.current.off('document:created')
      socketRef.current.off('document:signed')
      socketRef.current.off('document:updated')
      socketRef.current.off('document:status_changed')
      socketRef.current.off('document:approved')
      socketRef.current.off('document:rejected')
      
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  // Fonction pour s'abonner à un événement
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler)
      console.log(`📡 [useWebSocket] Abonnement à: ${event}`)
    } else {
      console.warn(`⚠️ [useWebSocket] Impossible de s'abonner à ${event}: socket non connecté`)
    }
  }, [])

  // Fonction pour se désabonner d'un événement
  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler)
      } else {
        socketRef.current.off(event)
      }
      console.log(`📡 [useWebSocket] Désabonnement de: ${event}`)
    }
  }, [])

  // Connexion lors du montage et quand l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [user?.id, connect, disconnect])

  // Mettre à jour les handlers quand ils changent (sans reconnexion)
  useEffect(() => {
    if (socketRef.current?.connected && handlersRef.current) {
      const socket = socketRef.current
      
      // Nettoyer les anciens handlers
      socket.off('document:created')
      socket.off('document:signed')
      socket.off('document:updated')
      socket.off('document:status_changed')
      socket.off('document:approved')
      socket.off('document:rejected')

      // Ajouter les nouveaux handlers
      if (handlersRef.current.onDocumentCreated) {
        socket.on('document:created', handlersRef.current.onDocumentCreated)
      }
      if (handlersRef.current.onDocumentSigned) {
        socket.on('document:signed', handlersRef.current.onDocumentSigned)
      }
      if (handlersRef.current.onDocumentUpdated) {
        socket.on('document:updated', handlersRef.current.onDocumentUpdated)
      }
      if (handlersRef.current.onDocumentStatusChanged) {
        socket.on('document:status_changed', handlersRef.current.onDocumentStatusChanged)
      }
      if (handlersRef.current.onDocumentApproved) {
        socket.on('document:approved', handlersRef.current.onDocumentApproved)
      }
      if (handlersRef.current.onDocumentRejected) {
        socket.on('document:rejected', handlersRef.current.onDocumentRejected)
      }
    }
  }, [handlers])

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
    unsubscribe,
  }
}
