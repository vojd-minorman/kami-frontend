'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, Clock, User, FileText, Calendar, Shield, Link2 } from 'lucide-react'

interface QRInfo {
  valid: boolean
  document: {
    id: string
    documentNumber: string
    documentType: string
    documentTypeCode: string | null
    status: string
    statusLabel: string
    createdAt: string
    createdBy: {
      id: string
      name: string
      email: string | null
      role: string | null
    }
    expirationDate: string | null
    version: number
  }
  signature: {
    isSigned: boolean
    isFullySigned: boolean
    completionDate: string | null
    firstSignatureDate: string | null
    signatories: Array<{
      id: string
      name: string
      email: string | null
      role: string
      signedAt: string | null
      signatureMethod: string
      hasSigned: boolean
      status: string
    }>
    signatureCount: number
    pendingCount: number
    totalSignatories: number
    progressPercentage: number
  }
  qrCode: {
    token: string
    generatedAt: string
    expirationDate: string | null
    isValid: boolean
    isRevoked: boolean
    isUsed: boolean
    qrCodeUrl: string | null
  }
  verification: {
    verified: boolean
    timestamp: string
    integrity: string
    verificationMethod: string
  }
  linkInfo: {
    documentId: string
    documentNumber: string
    documentTypeCode: string | null
    canBeLinked: true
    linkInstructions: string
  }
  metadata?: any
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
        const response = await fetch(`${apiUrl}/api/v1/qr/${token}/info`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erreur lors de la récupération des informations')
        }

        const data = await response.json()
        setQrInfo(data)
        setError(null)
      } catch (err: any) {
        console.error('Erreur:', err)
        setError(err.message || 'Une erreur est survenue')
        setQrInfo(null)
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
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !qrInfo || !qrInfo.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              QR Code invalide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error || 'Le QR code est invalide ou a expiré'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { document, signature, qrCode, verification, linkInfo } = qrInfo

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Informations du Document</h1>
          <p className="text-slate-600">Vérification et détails complets du document signé</p>
        </div>

        {/* Statut de vérification */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Shield className="h-5 w-5" />
              Document vérifié
            </CardTitle>
            <CardDescription className="text-green-600">
              Vérifié le {formatDate(verification.timestamp)} • Intégrité: {verification.integrity}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations du document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Numéro de Document</label>
                <p className="text-lg font-bold text-slate-900 mt-1">{document.documentNumber}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ce numéro peut être utilisé pour créer des liaisons avec d'autres documents
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Type de Document</label>
                <p className="text-slate-900 mt-1">{document.documentType}</p>
                {document.documentTypeCode && (
                  <Badge variant="outline" className="mt-1">
                    {document.documentTypeCode}
                  </Badge>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Statut</label>
                <div className="mt-1">
                  <Badge
                    variant={
                      document.status === 'SIGNED' || document.status === 'ACTIVE'
                        ? 'default'
                        : document.status === 'CANCELLED'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {document.statusLabel}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Créé le</label>
                <p className="text-slate-900 mt-1">{formatDate(document.createdAt)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Créé par</label>
                <p className="text-slate-900 mt-1">{document.createdBy.name}</p>
                {document.createdBy.email && (
                  <p className="text-sm text-slate-500 mt-1">{document.createdBy.email}</p>
                )}
                {document.createdBy.role && (
                  <Badge variant="outline" className="mt-1">
                    {document.createdBy.role}
                  </Badge>
                )}
              </div>

              {document.expirationDate && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Date d'expiration</label>
                  <p className="text-slate-900 mt-1">{formatDate(document.expirationDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations de signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {signature.isFullySigned ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
                État de la Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-600">Progression</label>
                  <span className="text-sm font-bold text-slate-900">
                    {signature.signatureCount}/{signature.totalSignatories}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      signature.isFullySigned
                        ? 'bg-green-600'
                        : signature.signatureCount > 0
                        ? 'bg-orange-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${signature.progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {signature.progressPercentage}% complété
                </p>
              </div>

              {signature.firstSignatureDate && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Première signature</label>
                  <p className="text-slate-900 mt-1">{formatDate(signature.firstSignatureDate)}</p>
                </div>
              )}

              {signature.completionDate && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Date de signature complète</label>
                  <p className="text-slate-900 mt-1 font-semibold text-green-700">
                    {formatDate(signature.completionDate)}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Signataires</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {signature.signatories.map((signatory) => (
                    <div
                      key={signatory.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-500" />
                            <p className="font-medium text-slate-900">{signatory.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{signatory.role}</p>
                          {signatory.email && (
                            <p className="text-xs text-slate-400 mt-1">{signatory.email}</p>
                          )}
                        </div>
                        <Badge
                          variant={signatory.hasSigned ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {signatory.status}
                        </Badge>
                      </div>
                      {signatory.signedAt && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="h-3 w-3" />
                            <span>Signé le {formatDate(signatory.signedAt)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Méthode: {signatory.signatureMethod}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations de liaison */}
        {linkInfo.canBeLinked && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Link2 className="h-5 w-5" />
                Liaison avec d'autres Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-blue-900">{linkInfo.linkInstructions}</p>
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                <label className="text-xs font-medium text-blue-700 uppercase">
                  Numéro de Document à utiliser
                </label>
                <p className="text-lg font-bold text-blue-900 mt-1 font-mono">
                  {linkInfo.documentNumber}
                </p>
                {linkInfo.documentTypeCode && (
                  <Badge variant="outline" className="mt-2">
                    Type: {linkInfo.documentTypeCode}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informations du QR Code */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Généré le</span>
              <span className="text-slate-900">{formatDate(qrCode.generatedAt)}</span>
            </div>
            {qrCode.expirationDate && (
              <div className="flex justify-between">
                <span className="text-slate-600">Expire le</span>
                <span className="text-slate-900">{formatDate(qrCode.expirationDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Statut</span>
              <Badge variant={qrCode.isValid && !qrCode.isRevoked ? 'default' : 'destructive'}>
                {qrCode.isValid && !qrCode.isRevoked ? 'Valide' : 'Révoqué'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}