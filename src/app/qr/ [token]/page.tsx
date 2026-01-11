'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, Clock, User, Calendar, FileText } from 'lucide-react'

interface QRInfo {
  valid: boolean
  document: {
    id: string
    documentNumber: string
    documentType: string
    documentTypeCode: string | null
    status: string
    createdAt: string
    createdBy: { id: string; name: string; email: string | null }
    expirationDate: string | null
    version: number
  }
  signature: {
    isSigned: boolean
    completionDate: string | null
    signatories: Array<{
      id: string
      name: string
      email: string | null
      role: string
      signedAt: string | null
      signatureMethod: string | null
      hasSigned: boolean
    }>
    signatureCount: number
    totalSignatories: number
  }
  qrCode: {
    token: string
    generatedAt: string
    expirationDate: string | null
    isValid: boolean
    isRevoked: boolean
    isUsed: boolean
  }
  verification: {
    verified: boolean
    timestamp: string
    integrity: string
  }
  linkInfo: {
    documentId: string
    documentNumber: string
    documentTypeCode: string | null
    canBeLinked: boolean
  }
}

export default function QRInfoPage() {
  const params = useParams()
  const token = params.token as string
  const [qrInfo, setQrInfo] = useState<QRInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQRInfo = async () => {
      try {
        setLoading(true)
        const data = await api.getQRInfo(token)
        setQrInfo(data)
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la récupération des informations du QR code')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchQRInfo()
    }
  }, [token])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString))
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Brouillon', variant: 'outline' },
      SUBMITTED: { label: 'Soumis', variant: 'default' },
      IN_PROGRESS: { label: 'En cours', variant: 'default' },
      VALIDATED: { label: 'Validé', variant: 'default' },
      SIGNED: { label: 'Signé', variant: 'default' },
      ACTIVE: { label: 'Actif', variant: 'default' },
      EXPIRED: { label: 'Expiré', variant: 'destructive' },
      CANCELLED: { label: 'Annulé', variant: 'destructive' },
      USED: { label: 'Utilisé', variant: 'secondary' },
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des informations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !qrInfo || !qrInfo.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              QR Code invalide ou expiré
            </CardTitle>
            <CardDescription>
              {error || 'Les informations du QR code ne peuvent pas être récupérées'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header avec validation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  Document vérifié
                </CardTitle>
                <CardDescription className="mt-2">
                  Informations complètes du document via QR code
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge variant="default" className="mb-2">
                  {qrInfo.verification.integrity === 'valid' ? 'Intégrité valide' : 'Intégrité compromise'}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Vérifié le {formatDate(qrInfo.verification.timestamp)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Informations du document */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations du document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">N° Document</p>
                <p className="text-lg font-semibold">{qrInfo.document.documentNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type de document</p>
                <p className="text-lg">{qrInfo.document.documentType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Statut</p>
                {getStatusBadge(qrInfo.document.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Version</p>
                <p className="text-lg">v{qrInfo.document.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date de création</p>
                <p className="text-lg">{formatDate(qrInfo.document.createdAt)}</p>
              </div>
              {qrInfo.document.expirationDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Date d'expiration</p>
                  <p className="text-lg">{formatDate(qrInfo.document.expirationDate)}</p>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Créé par</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <p className="text-base">{qrInfo.document.createdBy.name}</p>
                {qrInfo.document.createdBy.email && (
                  <span className="text-sm text-gray-500">({qrInfo.document.createdBy.email})</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations de signature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Statut de signature
            </CardTitle>
            <CardDescription>
              {qrInfo.signature.signatureCount} / {qrInfo.signature.totalSignatories} signataire(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Document signé</p>
                {qrInfo.signature.isSigned ? (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-base font-semibold text-green-600">Oui</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="text-base font-semibold text-yellow-600">En attente</span>
                  </div>
                )}
              </div>
              {qrInfo.signature.completionDate && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Date de signature complète</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-base">{formatDate(qrInfo.signature.completionDate)}</span>
                  </div>
                </div>
              )}
            </div>

            {qrInfo.signature.signatories && qrInfo.signature.signatories.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-3">Signataires</p>
                  <div className="space-y-3">
                    {qrInfo.signature.signatories.map((signatory, index) => (
                      <div
                        key={signatory.id || index}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <p className="font-medium">{signatory.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {signatory.role}
                            </Badge>
                          </div>
                          {signatory.email && (
                            <p className="text-sm text-gray-500 ml-6 mt-1">{signatory.email}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {signatory.hasSigned ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Signé</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-yellow-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-medium">En attente</span>
                            </div>
                          )}
                          {signatory.signedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(signatory.signedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informations du QR code */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du QR code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Token</p>
                <p className="text-xs font-mono text-gray-700 break-all">{qrInfo.qrCode.token}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Généré le</p>
                <p className="text-base">{formatDate(qrInfo.qrCode.generatedAt)}</p>
              </div>
              {qrInfo.qrCode.expirationDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Expire le</p>
                  <p className="text-base">{formatDate(qrInfo.qrCode.expirationDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Statut</p>
                {qrInfo.qrCode.isRevoked ? (
                  <Badge variant="destructive">Révoqué</Badge>
                ) : qrInfo.qrCode.isUsed ? (
                  <Badge variant="secondary">Utilisé</Badge>
                ) : (
                  <Badge variant="default">Valide</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations de liaison */}
        {qrInfo.linkInfo.canBeLinked && (
          <Card>
            <CardHeader>
              <CardTitle>Liaison de document</CardTitle>
              <CardDescription>
                Ce document peut être lié à d'autres documents (ex: bon de sortie)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>N° Document:</strong> {qrInfo.linkInfo.documentNumber}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Code Type:</strong> {qrInfo.linkInfo.documentTypeCode || 'N/A'}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Vous pouvez utiliser ce numéro de document pour créer une liaison avec un autre document.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Document vérifié via QR code - Mine de Shangolowe</p>
          <p className="text-xs mt-1">
            Vérifié le {formatDate(qrInfo.verification.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}
