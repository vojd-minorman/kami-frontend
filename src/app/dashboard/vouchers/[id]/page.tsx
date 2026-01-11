'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  FileSignature,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  FileText,
  Users,
  Link as LinkIcon,
  ExternalLink,
  QrCode,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type Document, type DocumentType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { DocumentSignersDialog } from '@/components/document-signers-dialog'
import { DocumentSignatureDialog } from '@/components/document-signature-dialog'
import type React from 'react'

export default function VoucherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params?.id as string
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signersDialogOpen, setSignersDialogOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  useEffect(() => {
    if (user && documentId) {
      loadDocument()
    }
  }, [user, documentId])

  // Écouter les événements WebSocket pour mettre à jour le document en temps réel
  useEffect(() => {
    if (!user || !documentId) return

    const handleDocumentSigned = (event: CustomEvent) => {
      const signedData = event.detail
      // Si c'est le document actuel qui a été signé, recharger
      if (signedData.documentId === documentId) {
        console.log('✍️ [VoucherDetail] Document signé, rechargement...', signedData)
        loadDocument()
      }
    }

    const handleDocumentStatusChanged = (event: CustomEvent) => {
      const statusData = event.detail
      // Si c'est le document actuel qui a changé de statut, recharger
      if (statusData.documentId === documentId) {
        console.log('📊 [VoucherDetail] Statut changé, rechargement...', statusData)
        loadDocument()
      }
    }

    const handleDocumentUpdated = (event: CustomEvent) => {
      const updatedData = event.detail
      // Si c'est le document actuel qui a été mis à jour, recharger
      if (updatedData.documentId === documentId) {
        console.log('🔄 [VoucherDetail] Document mis à jour, rechargement...', updatedData)
        loadDocument()
      }
    }

    const handleDocumentApproved = (event: CustomEvent) => {
      const approvedData = event.detail
      // Si c'est le document actuel qui a été approuvé, recharger
      if (approvedData.documentId === documentId) {
        console.log('✅ [VoucherDetail] Document approuvé, rechargement...', approvedData)
        loadDocument()
      }
    }

    const handleDocumentRejected = (event: CustomEvent) => {
      const rejectedData = event.detail
      // Si c'est le document actuel qui a été rejeté, recharger
      if (rejectedData.documentId === documentId) {
        console.log('❌ [VoucherDetail] Document rejeté, rechargement...', rejectedData)
        loadDocument()
      }
    }

    // Écouter les événements personnalisés émis par le WebSocketProvider
    window.addEventListener('document:signed', handleDocumentSigned as EventListener)
    window.addEventListener('document:status_changed', handleDocumentStatusChanged as EventListener)
    window.addEventListener('document:updated', handleDocumentUpdated as EventListener)
    window.addEventListener('document:approved', handleDocumentApproved as EventListener)
    window.addEventListener('document:rejected', handleDocumentRejected as EventListener)

    return () => {
      window.removeEventListener('document:signed', handleDocumentSigned as EventListener)
      window.removeEventListener('document:status_changed', handleDocumentStatusChanged as EventListener)
      window.removeEventListener('document:updated', handleDocumentUpdated as EventListener)
      window.removeEventListener('document:approved', handleDocumentApproved as EventListener)
      window.removeEventListener('document:rejected', handleDocumentRejected as EventListener)
    }
  }, [user, documentId])

  const loadDocument = async (updatedDocumentData?: any) => {
    try {
      setLoading(true)
      setError(null)
      
      let documentData: any
      
      // Si des données mises à jour sont fournies (depuis la réponse de signature), les utiliser
      if (updatedDocumentData) {
        documentData = updatedDocumentData
        console.log('[VoucherDetailPage] Using updated document data from signature response')
      } else {
        // Sinon, charger depuis l'API
        documentData = await api.getDocument(documentId)
      }
      
      // Debug: Vérifier les données des approvers
      if (documentData.approvers) {
        console.log('[VoucherDetailPage] Approvers data:', documentData.approvers.map((a: any) => ({
          id: a.id,
          name: a.fullName || a.email,
          order: a.$extras?.pivot_order ?? a.$extras?.order ?? a.order,
          hasSigned: a.$extras?.pivot_has_signed ?? a.$extras?.has_signed ?? a.hasSigned,
          signedAt: a.$extras?.pivot_signed_at ?? a.$extras?.signed_at ?? a.signedAt,
        })))
      }
      
      // Normaliser les approvers pour avoir un format cohérent
      // Le backend retourne déjà les approvers avec $extras, donc on les garde telles quelles
      // Mais on s'assure qu'ils ont bien la structure attendue
      if (documentData.approvers && Array.isArray(documentData.approvers)) {
        documentData.approvers = documentData.approvers.map((a: any) => {
          // Si les données viennent du backend (format pivot avec $extras), les garder telles quelles
          if (a.$extras && typeof a.$extras === 'object') {
            return a
          }
          // Si les données viennent de la réponse de signature (format normalisé), reconstruire $extras
          // Cela peut arriver si le format de réponse est différent
          return {
            ...a,
            $extras: {
              pivot_order: a.order ?? a.$extras?.pivot_order ?? 999,
              pivot_has_signed: a.hasSigned ?? a.$extras?.pivot_has_signed ?? false,
              pivot_signed_at: a.signedAt ?? a.$extras?.pivot_signed_at ?? null,
              pivot_signature_method: a.signatureMethod ?? a.$extras?.pivot_signature_method ?? null,
            },
          }
        })
      }
      
      // Mettre à jour le document immédiatement pour que les boutons soient mis à jour
      setDocument(documentData)
      
      // Le documentType est déjà préchargé avec fields et fieldGroups par le backend
      if (documentData.documentType) {
        setDocumentType(documentData.documentType)
      } else if (documentData.documentTypeId) {
        // Fallback: charger le type de document si non préchargé
        try {
          const documentTypeData = await api.getDocumentType(documentData.documentTypeId)
          setDocumentType(documentTypeData)
        } catch (err) {
          console.error('Error loading document type:', err)
          // Ne pas bloquer si le type de document ne peut pas être chargé
        }
      }
    } catch (err: any) {
      console.error('Error loading document:', err)
      setError(err.message || 'Erreur lors du chargement du document')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!document) return
    try {
      setProcessing(true)
      // Le backend générera automatiquement le PDF s'il n'existe pas
      const blob = await api.downloadDocumentPDF(document.id)
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `document-${document.documentNumber || document.id}.pdf`
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      const errorMessage = error?.message || 'Erreur lors du téléchargement du PDF'
      alert(`Erreur lors du téléchargement du PDF: ${errorMessage}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadQRCode = async () => {
    if (!document) return
    try {
      setProcessing(true)
      
      // Récupérer l'URL du QR code
      let qrCodeUrl = document.qrCodeUrl || null
      let qrCodeDataUrl = document.qrCode || null
      
      // Si on a l'URL publique, l'utiliser
      if (qrCodeUrl) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
        const fullUrl = qrCodeUrl.startsWith('http') ? qrCodeUrl : `${apiUrl}${qrCodeUrl}`
        
        // Récupérer l'image depuis l'URL
        const response = await fetch(fullUrl)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = window.document.createElement('a')
          a.href = url
          a.download = `qr-code-${document.documentNumber || document.id}.png`
          window.document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          window.document.body.removeChild(a)
          return
        }
      }
      
      // Sinon, utiliser le data URL si disponible
      if (qrCodeDataUrl) {
        // Convertir le data URL en blob
        const response = await fetch(qrCodeDataUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = `qr-code-${document.documentNumber || document.id}.png`
        window.document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        window.document.body.removeChild(a)
        return
      }
      
      // Si aucun QR code n'est disponible, essayer de le générer via l'API
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          throw new Error('Token d\'authentification manquant')
        }
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
        const response = await fetch(`${apiUrl}/api/v1/qr/${document.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.qrCode) {
            // Utiliser le QR code généré
            const qrResponse = await fetch(data.qrCode)
            const blob = await qrResponse.blob()
            const url = window.URL.createObjectURL(blob)
            const a = window.document.createElement('a')
            a.href = url
            a.download = `qr-code-${document.documentNumber || document.id}.png`
            window.document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            window.document.body.removeChild(a)
            
            // Recharger le document pour mettre à jour les données
            await loadDocument()
            return
          }
        }
      } catch (err) {
        console.error('Error generating QR code:', err)
      }
      
      alert('QR Code non disponible pour ce document')
    } catch (error: any) {
      console.error('Error downloading QR code:', error)
      const errorMessage = error?.message || 'Erreur lors du téléchargement du QR Code'
      alert(`Erreur lors du téléchargement du QR Code: ${errorMessage}`)
    } finally {
      setProcessing(false)
    }
  }

  // Vérifier si l'utilisateur a déjà signé ce document
  const hasUserSigned = () => {
    if (!document || !user || !document.approvers) return false
    
    const userApprover = document.approvers.find((a: any) => a.id === user.id)
    if (!userApprover) return false
    
    const pivot = (userApprover as any).$extras || {}
    return pivot.pivot_has_signed === true || 
           pivot.has_signed === true || 
           (typeof pivot.pivot_has_signed === 'boolean' && pivot.pivot_has_signed) ||
           (typeof pivot.has_signed === 'boolean' && pivot.has_signed)
  }

  // Fonction helper pour vérifier si un signataire a signé
  const hasSignerSignedHelper = (approver: any): boolean => {
    if (!approver) return false
    const pivot = (approver as any).$extras || {}
    return pivot.pivot_has_signed === true || 
           pivot.has_signed === true ||
           (typeof pivot.pivot_has_signed === 'boolean' && pivot.pivot_has_signed) ||
           (typeof pivot.has_signed === 'boolean' && pivot.has_signed)
  }

  // Fonction helper pour obtenir l'ordre d'un signataire
  const getSignerOrder = (approver: any): number => {
    if (!approver) return 999
    const pivot = (approver as any).$extras || {}
    return pivot.pivot_order ?? pivot.order ?? 999
  }

  // Vérifier si l'utilisateur peut signer ce document
  const canUserSign = () => {
    if (!document || !user) {
      console.log('[canUserSign] No document or user')
      return false
    }
    
    // Si l'utilisateur a déjà signé, il ne peut plus signer
    if (hasUserSigned()) {
      console.log('[canUserSign] User has already signed')
      return false
    }
    
    // Si le document est en DRAFT, seul le créateur peut signer (pour initialiser le processus)
    if (document.status === 'DRAFT') {
      const canSign = document.createdBy === user.id && !hasUserSigned()
      console.log('[canUserSign] Document is DRAFT, creator can sign:', canSign)
      return canSign
    }
    
    // Si le document est en SUBMITTED ou IN_PROGRESS, vérifier si l'utilisateur est dans les signataires
    if ((document.status === 'SUBMITTED' || document.status === 'IN_PROGRESS') && document.approvers) {
      const userApprover = document.approvers.find((a: any) => a.id === user.id)
      if (!userApprover) {
        console.log('[canUserSign] User is not in approvers list')
        return false
      }
      
      // Trier les signataires par ordre pour vérifier correctement
      const sortedApprovers = [...document.approvers].sort((a: any, b: any) => {
        return getSignerOrder(a) - getSignerOrder(b)
      })
      
      console.log('[canUserSign] Sorted approvers:', sortedApprovers.map((a: any) => ({
        id: a.id,
        name: a.fullName || a.email,
        order: getSignerOrder(a),
        hasSigned: hasSignerSignedHelper(a),
      })))
      
      // Trouver l'index de l'utilisateur dans la liste triée
      const userIndex = sortedApprovers.findIndex((a: any) => a.id === user.id)
      if (userIndex === -1) {
        console.log('[canUserSign] User index not found')
        return false
      }
      
      console.log('[canUserSign] User index:', userIndex, 'Total approvers:', sortedApprovers.length)
      
      // Si c'est le premier signataire (index 0), il peut toujours signer s'il n'a pas encore signé
      if (userIndex === 0) {
        const canSign = !hasSignerSignedHelper(sortedApprovers[0])
        console.log('[canUserSign] User is first signer, can sign:', canSign)
        return canSign
      }
      
      // Pour les autres signataires, vérifier que TOUS les signataires précédents ont signé
      const previousSigners = sortedApprovers.slice(0, userIndex)
      
      // Si aucun signataire précédent, l'utilisateur peut signer (ne devrait pas arriver normalement)
      if (previousSigners.length === 0) {
        console.log('[canUserSign] No previous signers (should not happen), allowing signature')
        return true
      }
      
      // Vérifier que tous les signataires précédents ont signé
      const allPreviousSigned = previousSigners.every((a: any) => {
        const hasSigned = hasSignerSignedHelper(a)
        console.log(`[canUserSign] Previous signer ${a.fullName || a.email} (order ${getSignerOrder(a)}): hasSigned=${hasSigned}`)
        return hasSigned
      })
      
      console.log('[canUserSign] All previous signers signed:', allPreviousSigned)
      console.log('[canUserSign] Previous signers:', previousSigners.map((a: any) => ({
        id: a.id,
        name: a.fullName || a.email,
        order: getSignerOrder(a),
        hasSigned: hasSignerSignedHelper(a),
      })))
      
      // L'utilisateur peut signer si tous les précédents ont signé
      // Cela fonctionne même s'il n'y a que deux signataires (le créateur qui a déjà signé et lui-même)
      return allPreviousSigned
    }
    
    console.log('[canUserSign] Document status:', document.status, 'does not allow signing')
    return false
  }
  
  // Obtenir le message pour l'utilisateur qui ne peut pas encore signer
  const getWaitingMessage = (): string | null => {
    if (!document || !user || !document.approvers) return null
    
    const userApprover = document.approvers.find((a: any) => a.id === user.id)
    if (!userApprover) return null
    
    if (hasUserSigned()) return null
    
    if ((document.status === 'SUBMITTED' || document.status === 'IN_PROGRESS')) {
      // Trier les signataires par ordre
      const sortedApprovers = [...document.approvers].sort((a: any, b: any) => {
        return getSignerOrder(a) - getSignerOrder(b)
      })
      
      const userIndex = sortedApprovers.findIndex((a: any) => a.id === user.id)
      if (userIndex === -1 || userIndex === 0) return null
      
      // Trouver le premier signataire précédent qui n'a pas encore signé
      const previousSigners = sortedApprovers.slice(0, userIndex)
      const firstUnsigned = previousSigners.find((a: any) => !hasSignerSignedHelper(a))
      
      if (firstUnsigned) {
        const name = firstUnsigned.fullName || firstUnsigned.email || 'Un signataire'
        return `En attente de la signature de ${name}`
      }
    }
    
    return null
  }

  const handleSign = async () => {
    if (!document) return
    setSignatureDialogOpen(true)
  }

  const handleReject = async () => {
    if (!document) return
    const reason = prompt('Veuillez indiquer la raison du rejet :')
    if (!reason) return

    try {
      setProcessing(true)
      await api.rejectDocument(document.id, reason)
      await loadDocument() // Recharger les données
    } catch (err: any) {
      console.error('Error rejecting document:', err)
      alert(err.message || 'Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      DRAFT: { label: "Brouillon", variant: "outline" },
      SUBMITTED: { label: "Soumis - En attente de signature", variant: "secondary" },
      IN_PROGRESS: { label: "En cours de signature", variant: "default" },
      SIGNED: { label: "Signé", variant: "default" },
      VALIDATED: { label: "Validé", variant: "default" },
      ACTIVE: { label: "Actif", variant: "default" },
      EXPIRED: { label: "Expiré", variant: "secondary" },
      CANCELLED: { label: "Annulé", variant: "destructive" },
      USED: { label: "Utilisé", variant: "secondary" },
      // Anciens statuts pour compatibilité
      draft: { label: "Brouillon", variant: "outline" },
      pending: { label: "En attente", variant: "secondary" },
      in_progress: { label: "En cours de signature", variant: "default" },
      signed: { label: "Signé", variant: "default" },
      approved: { label: "Approuvé", variant: "default" },
      rejected: { label: "Rejeté", variant: "destructive" },
    }
    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  if (error || !document) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/vouchers">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Erreur</h1>
            </div>
          </div>
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error || 'Document introuvable'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/vouchers">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Document #{document.documentNumber || document.id}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                {document.documentType?.name || 'Type de document inconnu'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={processing}
              className="flex-1 sm:flex-none"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger PDF
            </Button>
            {/* Boutons pour les documents soumis ou en cours de signature */}
            {(document.status === 'SUBMITTED' || document.status === 'IN_PROGRESS') && (
              <>
                {/* Si l'utilisateur a déjà signé, afficher un badge "Déjà signé" - les boutons doivent disparaître */}
                {hasUserSigned() ? (
                  <Button
                    variant="outline"
                    disabled
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Déjà signé
                  </Button>
                ) : document.approvers && document.approvers.some((a: any) => a.id === user?.id) ? (
                  // Si l'utilisateur est dans les signataires
                  canUserSign() ? (
                    // Si l'utilisateur peut signer (c'est son tour), afficher les boutons Signer et Rejeter
                    <>
                      <Button
                        variant="default"
                        onClick={handleSign}
                        disabled={processing}
                        className="flex-1 sm:flex-none"
                      >
                        {processing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSignature className="mr-2 h-4 w-4" />
                        )}
                        Signer
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={processing}
                        className="flex-1 sm:flex-none"
                      >
                        {processing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Rejeter
                      </Button>
                    </>
                  ) : (
                    // Si l'utilisateur est dans les signataires mais ce n'est pas encore son tour
                    (() => {
                      const waitingMessage = getWaitingMessage()
                      return (
                        <Button
                          variant="outline"
                          disabled
                          className="flex-1 sm:flex-none"
                          title={waitingMessage || 'En attente de votre tour de signature'}
                        >
                          <FileSignature className="mr-2 h-4 w-4" />
                          {waitingMessage || 'En attente de votre tour'}
                        </Button>
                      )
                    })()
                  )
                ) : null}
              </>
            )}
            {/* Boutons pour les documents en brouillon - seul le créateur peut signer pour initialiser */}
            {document.status === 'DRAFT' && document.createdBy === user?.id && (
              <>
                {!hasUserSigned() ? (
                  // Si le créateur n'a pas encore signé, afficher les boutons pour ajouter des signataires et signer
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setSignersDialogOpen(true)}
                      disabled={processing}
                      className="flex-1 sm:flex-none"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Signataires
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSign}
                      disabled={processing}
                      className="flex-1 sm:flex-none"
                    >
                      {processing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileSignature className="mr-2 h-4 w-4" />
                      )}
                      Signer (Créateur)
                    </Button>
                  </>
                ) : (
                  // Si le créateur a déjà signé, afficher un badge indiquant que le document est soumis
                  // Après la signature, le statut devrait passer à SUBMITTED, donc ce cas ne devrait plus s'afficher
                  // Mais on le garde comme fallback au cas où le rechargement n'a pas encore eu lieu
                  <Button
                    variant="outline"
                    disabled
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Document soumis pour signature
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Statut :</span>
          {getStatusBadge(document.status)}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Informations principales */}
          <Card className="md:col-span-2 lg:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Créé par
                  </div>
                  <p className="font-medium">
                    {document.creator?.fullName || document.creator?.email || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Site
                  </div>
                  <p className="font-medium">{document.siteName || document.siteId || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date de création
                  </div>
                  <p className="font-medium">
                    {document.createdAt
                      ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Dernière modification
                  </div>
                  <p className="font-medium">
                    {document.updatedAt
                      ? new Date(document.updatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Valeurs du document */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Données du document</h3>
                {document.values && Object.keys(document.values).length > 0 ? (() => {
                  // Créer un mapping complet des champs (nom technique -> label + type)
                  const fieldMap = new Map<string, { label: string; type?: string }>()
                  
                  // Mapper les champs simples (hors groupes)
                  if (documentType?.fields) {
                    documentType.fields.forEach((field: any) => {
                      if (!field.documentFieldGroupId) {
                        fieldMap.set(field.name, { 
                          label: field.label || field.name, 
                          type: field.type 
                        })
                      }
                    })
                  }
                  
                  // Mapper les champs dans les groupes
                  if (documentType?.fieldGroups) {
                    documentType.fieldGroups.forEach((group: any) => {
                      if (group.fields && Array.isArray(group.fields)) {
                        group.fields.forEach((field: any) => {
                          fieldMap.set(field.name, { 
                            label: field.label || field.name, 
                            type: field.type 
                          })
                        })
                      }
                    })
                  }
                  
                  // Créer un mapping des groupes (nom technique -> label + propriétés)
                  const groupMap = new Map<string, { label: string; isRepeatable: boolean; fields?: any[]; order?: number }>()
                  if (documentType?.fieldGroups) {
                    documentType.fieldGroups.forEach((group: any) => {
                      groupMap.set(group.name, {
                        label: group.label || group.name,
                        isRepeatable: group.isRepeatable || false,
                        fields: group.fields || [],
                        order: group.order || 0
                      })
                    })
                  }
                  
                  // Fonction pour formater une valeur selon son type
                  const formatValue = (value: any, fieldType?: string, fieldOptions?: any): React.ReactNode | string => {
                    if (value === undefined || value === null) {
                      return 'N/A'
                    }
                    
                    if (fieldType === 'checkbox' || fieldType === 'yesno') {
                      // Parser les options pour obtenir les labels personnalisés pour yesno
                      let yesNoOptions: { yesLabel: string; noLabel: string } = { yesLabel: 'Oui', noLabel: 'Non' }
                      if (fieldType === 'yesno' && fieldOptions) {
                        if (typeof fieldOptions === 'string') {
                          try {
                            const parsed = JSON.parse(fieldOptions)
                            if (parsed.yesLabel && parsed.noLabel) {
                              yesNoOptions = parsed
                            }
                          } catch (e) {
                            // Garder les valeurs par défaut
                          }
                        } else if (typeof fieldOptions === 'object' && fieldOptions.yesLabel && fieldOptions.noLabel) {
                          yesNoOptions = fieldOptions
                        }
                      }
                      
                      const isYes = value === true || value === 'true' || value === 1 || value === '1' || value === 'Oui' || value === yesNoOptions.yesLabel
                      return isYes ? yesNoOptions.yesLabel : yesNoOptions.noLabel
                    } else if (fieldType === 'time') {
                      // Type time : afficher l'heure
                      if (typeof value === 'string') {
                        // Si c'est déjà au format HH:MM, l'afficher tel quel
                        if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                          return value
                        }
                        // Sinon, essayer de parser comme date
                        try {
                          const date = new Date(value)
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })
                          }
                        } catch (e) {
                          // Garder la valeur originale
                        }
                      }
                      return String(value)
                    } else if (fieldType === 'date' || fieldType === 'datetime') {
                      try {
                        const date = new Date(value)
                        if (isNaN(date.getTime())) {
                          return String(value)
                        }
                        return date.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          ...(fieldType === 'datetime' ? { hour: '2-digit', minute: '2-digit' } : {})
                        })
                      } catch (e) {
                        return String(value)
                      }
                    } else if (fieldType === 'number') {
                      return typeof value === 'number' ? value.toString() : String(value)
                    } else if (fieldType === 'image') {
                      // Type image : afficher l'image
                      const imageUrl = typeof value === 'string' ? value : (value?.url || value?.src || '')
                      if (!imageUrl) return 'Aucune image'
                      
                      return (
                        <div className="mt-2">
                          <img src={imageUrl} alt="Image" className="max-w-full h-auto max-h-64 rounded border" />
                        </div>
                      )
                    } else if (fieldType === 'image_multiple') {
                      // Type image_multiple : afficher toutes les images
                      const images = Array.isArray(value) ? value : (value ? [value] : [])
                      const imageUrls = images.map(img => typeof img === 'string' ? img : (img?.url || img?.src || '')).filter(Boolean)
                      
                      if (imageUrls.length === 0) return 'Aucune image'
                      
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                          {imageUrls.map((url, index) => (
                            <img key={index} src={url} alt={`Image ${index + 1}`} className="w-full h-32 object-cover rounded border" />
                          ))}
                        </div>
                      )
                    } else if (typeof value === 'object' && !Array.isArray(value)) {
                      // Objet complexe : afficher en JSON formaté
                      try {
                        return <pre className="text-xs bg-muted p-2 rounded overflow-auto max-w-md">{JSON.stringify(value, null, 2)}</pre>
                      } catch (e) {
                        return String(value)
                      }
                    } else if (Array.isArray(value)) {
                      // Tableau : afficher comme liste (sauf si c'est déjà géré par image_multiple)
                      return value.length > 0 ? value.join(', ') : 'Aucun'
                    }
                    
                    return String(value)
                  }
                  
                  // Fonction pour obtenir un label lisible à partir d'un nom technique
                  const getReadableLabel = (technicalName: string): string => {
                    // Si on a un mapping, l'utiliser
                    const fieldInfo = fieldMap.get(technicalName)
                    if (fieldInfo?.label) {
                      return fieldInfo.label
                    }
                    
                    // Sinon, convertir le nom technique en label lisible
                    // Ex: "invoice_line" -> "Invoice Line", "dg_model" -> "Dg Model"
                    return technicalName
                      .replace(/_/g, ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')
                      .trim()
                  }
                  
                  // Séparer les champs simples des groupes
                  const simpleFields: Array<[string, any]> = []
                  const groupFields: Array<[string, any]> = []
                  const unmappedFields: Array<[string, any]> = []
                  
                  Object.entries(document.values).forEach(([key, value]) => {
                    if (groupMap.has(key)) {
                      groupFields.push([key, value])
                    } else if (fieldMap.has(key)) {
                      simpleFields.push([key, value])
                    } else {
                      // Champ non mappé (peut être un champ orphelin ou une valeur système)
                      unmappedFields.push([key, value])
                    }
                  })
                  
                  return (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      {/* Afficher les champs simples */}
                      {simpleFields.length > 0 && (
                        <div className="space-y-3">
                          {simpleFields.map(([key, value]) => {
                            if (value === undefined || value === null || value === '') return null
                            
                            const fieldInfo = fieldMap.get(key)
                            const label = fieldInfo?.label || getReadableLabel(key)
                            
                            // Obtenir les options du champ si disponible
                            let fieldOptions = null
                            if (documentType?.fields) {
                              const fieldModel = documentType.fields.find((f: any) => f.name === key)
                              if (fieldModel?.options) {
                                fieldOptions = typeof fieldModel.options === 'string' ? JSON.parse(fieldModel.options) : fieldModel.options
                              }
                            }
                            if (!fieldOptions && documentType?.fieldGroups) {
                              for (const group of documentType.fieldGroups) {
                                const fieldModel = group.fields?.find((f: any) => f.name === key)
                                if (fieldModel?.options) {
                                  fieldOptions = typeof fieldModel.options === 'string' ? JSON.parse(fieldModel.options) : fieldModel.options
                                  break
                                }
                              }
                            }
                            
                            const displayValue = formatValue(value, fieldInfo?.type, fieldOptions)
                            
                            // Pour les images, afficher différemment
                            if (fieldInfo?.type === 'image' || fieldInfo?.type === 'image_multiple') {
                              return (
                                <div key={key} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{label}:</span>
                                  </div>
                                  <div>{displayValue}</div>
                                </div>
                              )
                            }
                            
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-medium">{typeof displayValue === 'string' ? displayValue : String(displayValue)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Afficher les groupes de champs */}
                      {groupFields.length > 0 && (
                        <div className="space-y-4 border-t pt-4">
                          {groupFields
                            .sort(([keyA], [keyB]) => {
                              const groupA = groupMap.get(keyA)
                              const groupB = groupMap.get(keyB)
                              return (groupA?.order || 0) - (groupB?.order || 0)
                            })
                            .map(([key, groupValue]) => {
                              const groupInfo = groupMap.get(key)
                              if (!groupInfo) return null
                              
                              return (
                                <div key={key} className="space-y-2">
                                  <h4 className="font-semibold text-sm">{groupInfo.label}</h4>
                                  {groupInfo.isRepeatable ? (
                                    // Groupe répétable (tableau)
                                    Array.isArray(groupValue) && groupValue.length > 0 ? (
                                      <div className="space-y-3 pl-4 border-l-2 border-border">
                                        {groupValue.map((row: any, rowIndex: number) => (
                                          <div key={rowIndex} className="space-y-2">
                                            <div className="text-xs text-muted-foreground font-medium">
                                              Ligne {rowIndex + 1}
                                            </div>
                                            <div className="space-y-1 pl-2">
                                              {Object.entries(row).map(([fieldName, fieldValue]) => {
                                                if (fieldValue === undefined || fieldValue === null || fieldValue === '') return null
                                                
                                                const fieldInfo = fieldMap.get(fieldName)
                                                const label = fieldInfo?.label || getReadableLabel(fieldName)
                                                
                                                // Obtenir les options du champ
                                                let fieldOptions = null
                                                if (groupInfo.fields) {
                                                  const fieldModel = groupInfo.fields.find((f: any) => f.name === fieldName)
                                                  if (fieldModel?.options) {
                                                    fieldOptions = typeof fieldModel.options === 'string' ? JSON.parse(fieldModel.options) : fieldModel.options
                                                  }
                                                }
                                                
                                                const displayValue = formatValue(fieldValue, fieldInfo?.type, fieldOptions)
                                                
                                                // Pour les images, afficher différemment
                                                if (fieldInfo?.type === 'image' || fieldInfo?.type === 'image_multiple') {
                                                  return (
                                                    <div key={fieldName} className="space-y-1">
                                                      <div className="text-muted-foreground text-xs">{label}:</div>
                                                      <div>{displayValue}</div>
                                                    </div>
                                                  )
                                                }
                                                
                                                // Pour les images, afficher différemment
                                                if (fieldInfo?.type === 'image' || fieldInfo?.type === 'image_multiple') {
                                                  return (
                                                    <div key={fieldName} className="space-y-1">
                                                      <div className="text-muted-foreground text-xs">{label}:</div>
                                                      <div>{typeof displayValue === 'string' ? displayValue : displayValue}</div>
                                                    </div>
                                                  )
                                                }
                                                
                                                return (
                                                  <div key={fieldName} className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{label}:</span>
                                                    <span className="font-medium">{typeof displayValue === 'string' ? displayValue : String(displayValue)}</span>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground pl-4">Aucune ligne</p>
                                    )
                                  ) : (
                                    // Groupe simple (objet)
                                    typeof groupValue === 'object' && !Array.isArray(groupValue) && groupValue !== null ? (
                                      <div className="space-y-1 pl-4 border-l-2 border-border">
                                        {Object.entries(groupValue).map(([fieldName, fieldValue]) => {
                                          if (fieldValue === undefined || fieldValue === null || fieldValue === '') return null
                                          
                                          const fieldInfo = fieldMap.get(fieldName)
                                          const label = fieldInfo?.label || getReadableLabel(fieldName)
                                          
                                          // Obtenir les options du champ
                                          let fieldOptions = null
                                          if (groupInfo.fields) {
                                            const fieldModel = groupInfo.fields.find((f: any) => f.name === fieldName)
                                            if (fieldModel?.options) {
                                              fieldOptions = typeof fieldModel.options === 'string' ? JSON.parse(fieldModel.options) : fieldModel.options
                                            }
                                          }
                                          
                                          const displayValue = formatValue(fieldValue, fieldInfo?.type, fieldOptions)
                                          
                                          // Pour les images, afficher différemment
                                          if (fieldInfo?.type === 'image' || fieldInfo?.type === 'image_multiple') {
                                            return (
                                              <div key={fieldName} className="space-y-2">
                                                <div className="text-muted-foreground text-sm">{label}:</div>
                                                <div>{displayValue}</div>
                                              </div>
                                            )
                                          }
                                          
                                          // Pour les images, afficher différemment
                                          if (fieldInfo?.type === 'image' || fieldInfo?.type === 'image_multiple') {
                                            return (
                                              <div key={fieldName} className="space-y-2">
                                                <div className="text-muted-foreground text-sm">{label}:</div>
                                                <div>{displayValue}</div>
                                              </div>
                                            )
                                          }
                                          
                                          return (
                                            <div key={fieldName} className="flex justify-between text-sm">
                                              <span className="text-muted-foreground">{label}:</span>
                                              <span className="font-medium">{typeof displayValue === 'string' ? displayValue : String(displayValue)}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground pl-4">Aucune donnée</p>
                                    )
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                      
                      {/* Afficher les champs non mappés (fallback) */}
                      {unmappedFields.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                          <p className="text-xs text-muted-foreground italic">
                            Champs supplémentaires
                          </p>
                          {unmappedFields.map(([key, value]) => {
                            if (value === undefined || value === null || value === '') return null
                            
                            const label = getReadableLabel(key)
                            const displayValue = formatValue(value)
                            
                            // Vérifier si c'est une URL d'image (pour les champs non mappés)
                            const isImageUrl = typeof value === 'string' && (value.match(/\.(jpg|jpeg|png|webp|gif)$/i) || value.startsWith('http') && value.includes('/uploads/images/'))
                            
                            if (isImageUrl) {
                              return (
                                <div key={key} className="space-y-2">
                                  <div className="text-muted-foreground text-sm">{label}:</div>
                                  <img src={value} alt={label} className="max-w-full h-auto max-h-64 rounded border" />
                                </div>
                              )
                            }
                            
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-medium">{typeof displayValue === 'string' ? displayValue : String(displayValue)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations complémentaires */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type de document</div>
                  <div className="font-medium">{document.documentType?.name || 'N/A'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Version</div>
                  <div className="font-medium">v{document.version || 1}</div>
                </div>
                
                {/* QR Code */}
                {(document.qrCode || document.qrCodeUrl) && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Code QR
                      </div>
                      <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                        {/* Affichage du QR Code */}
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          {document.qrCodeUrl ? (
                            <img
                              src={
                                document.qrCodeUrl.startsWith('http')
                                  ? document.qrCodeUrl
                                  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}${document.qrCodeUrl}`
                              }
                              alt="QR Code"
                              className="w-48 h-48 object-contain"
                              onError={(e) => {
                                // Fallback sur le data URL si l'URL publique échoue
                                if (document.qrCode && e.currentTarget.src !== document.qrCode) {
                                  e.currentTarget.src = document.qrCode
                                }
                              }}
                            />
                          ) : document.qrCode ? (
                            <img
                              src={document.qrCode}
                              alt="QR Code"
                              className="w-48 h-48 object-contain"
                            />
                          ) : null}
                        </div>
                        
                        {/* Bouton de téléchargement */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadQRCode}
                          disabled={processing}
                          className="w-full"
                        >
                          {processing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Télécharger le QR Code
                        </Button>
                        
                        {/* Lien vers la page d'informations du QR Code */}
                        {document.qrToken && (
                          <Link
                            href={`/qr/${document.qrToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                          >
                            Voir les informations complètes
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {document.approvers && document.approvers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Signataires</div>
                      <div className="space-y-2">
                        {document.approvers
                          .sort((a: any, b: any) => {
                            const orderA = (a as any).$extras?.pivot_order ?? (a as any).$extras?.order ?? 999
                            const orderB = (b as any).$extras?.pivot_order ?? (b as any).$extras?.order ?? 999
                            return orderA - orderB
                          })
                          .map((approver: any) => {
                            // Essayer plusieurs formats pour la compatibilité
                            const pivot = (approver as any).$extras || {}
                            const hasSigned = pivot.pivot_has_signed === true || 
                                             pivot.has_signed === true || 
                                             (typeof pivot.pivot_has_signed === 'boolean' && pivot.pivot_has_signed) ||
                                             (typeof pivot.has_signed === 'boolean' && pivot.has_signed)
                            const order = pivot.pivot_order ?? pivot.order ?? 999
                            const signedAt = pivot.pivot_signed_at ?? pivot.signed_at
                            
                            return (
                              <div key={approver.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">#{order}</span>
                                  <span className="font-medium">{approver.fullName || approver.email}</span>
                                  {hasSigned ? (
                                    <Badge variant="default" className="text-xs">Signé</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">En attente</Badge>
                                  )}
                                </div>
                                {hasSigned && signedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(signedAt).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </>
                )}
                {document.signatures && document.signatures.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Historique des signatures</div>
                      <div className="space-y-2">
                        {document.signatures.map((signature: any, index: number) => (
                          <div key={index} className="text-sm">
                            <div className="font-medium">{signature.signer?.fullName || signature.signer?.email || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {signature.signedAt
                                ? new Date(signature.signedAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''}
                              {signature.signatureMethod && ` • ${signature.signatureMethod}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Liaisons de documents */}
          {(document.sourceLinks && document.sourceLinks.length > 0) || (document.targetLinks && document.targetLinks.length > 0) ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Documents liés
                </CardTitle>
                <CardDescription className="text-sm">
                  Documents associés à ce document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Documents liés depuis ce document (sourceLinks) */}
                {document.sourceLinks && document.sourceLinks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Documents liés depuis ce document
                    </h4>
                    <div className="space-y-2">
                      {document.sourceLinks.map((link: any) => (
                        <div
                          key={link.id}
                          className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/vouchers/${link.targetDocument?.id}`}
                                  className="font-medium hover:underline flex items-center gap-2"
                                >
                                  {link.targetDocument?.documentNumber || 'N/A'}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                                <Badge variant="outline" className="text-xs">
                                  {link.linkType || 'reference'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {link.targetDocument?.documentType?.name || 'Type inconnu'}
                                {link.targetDocument?.status && (
                                  <> • {link.targetDocument.status}</>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents qui lient ce document (targetLinks) */}
                {document.targetLinks && document.targetLinks.length > 0 && (
                  <div className="space-y-2">
                    {document.sourceLinks && document.sourceLinks.length > 0 && <Separator />}
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Documents qui lient ce document
                    </h4>
                    <div className="space-y-2">
                      {document.targetLinks.map((link: any) => (
                        <div
                          key={link.id}
                          className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/vouchers/${link.sourceDocument?.id}`}
                                  className="font-medium hover:underline flex items-center gap-2"
                                >
                                  {link.sourceDocument?.documentNumber || 'N/A'}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                                <Badge variant="outline" className="text-xs">
                                  {link.linkType || 'reference'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {link.sourceDocument?.documentType?.name || 'Type inconnu'}
                                {link.sourceDocument?.status && (
                                  <> • {link.sourceDocument.status}</>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Dialogs */}
        {document && (
          <>
            <DocumentSignersDialog
              open={signersDialogOpen}
              onOpenChange={setSignersDialogOpen}
              documentId={documentId}
              onSuccess={() => {
                loadDocument()
                setSignersDialogOpen(false)
              }}
            />
            <DocumentSignatureDialog
              open={signatureDialogOpen}
              onOpenChange={(open) => {
                setSignatureDialogOpen(open)
                // Si le dialog se ferme sans avoir signé (annulation), ne pas recharger
                // (onSuccess sera appelé uniquement après une signature réussie)
              }}
              documentId={documentId}
              onSuccess={async (updatedDocumentData?: any) => {
                // Mettre à jour le document immédiatement avec les données fournies pour que les boutons disparaissent/appaissent immédiatement
                try {
                  setProcessing(true)
                  
                  if (updatedDocumentData) {
                    // Utiliser les données mises à jour fournies par l'API de signature
                    // Cela permet une mise à jour immédiate sans attendre un nouveau chargement
                    // Les boutons seront mis à jour immédiatement :
                    // - Pour l'utilisateur qui vient de signer : les boutons "Signer" et "Rejeter" disparaissent
                    // - Pour le prochain signataire (si c'est son tour) : le bouton "Signer" apparaît
                    await loadDocument(updatedDocumentData)
                    setProcessing(false)
                    
                    // Recharger une dernière fois après un court délai pour s'assurer que toutes les opérations backend
                    // (génération PDF, mise à jour statut, etc.) sont terminées et synchronisées
                    // Ce deuxième rechargement garantit que les données sont bien synchronisées
                    // notamment pour le changement de statut DRAFT -> SUBMITTED -> IN_PROGRESS
                    setTimeout(async () => {
                      try {
                        await loadDocument()
                      } catch (error) {
                        console.error('Error in final reload after signature:', error)
                      }
                    }, 400)
                  } else {
                    // Si pas de données fournies, recharger depuis l'API
                    await loadDocument()
                    setProcessing(false)
                    
                    // Recharger une deuxième fois pour garantir la synchronisation
                    setTimeout(async () => {
                      try {
                        await loadDocument()
                      } catch (error) {
                        console.error('Error in second reload after signature:', error)
                      }
                    }, 400)
                  }
                } catch (error) {
                  console.error('Error updating document after signature:', error)
                  setProcessing(false)
                }
              }}
            />
          </>
        )}
      </div>
    </DashboardShell>
  )
}

