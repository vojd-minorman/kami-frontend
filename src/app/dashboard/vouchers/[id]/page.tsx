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
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type Bon, type BonType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { BonSignersDialog } from '@/components/bon-signers-dialog'
import { BonSignatureDialog } from '@/components/bon-signature-dialog'

export default function VoucherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bonId = params?.id as string
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [bon, setBon] = useState<Bon | null>(null)
  const [bonType, setBonType] = useState<BonType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signersDialogOpen, setSignersDialogOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  useEffect(() => {
    if (user && bonId) {
      loadBon()
    }
  }, [user, bonId])

  const loadBon = async () => {
    try {
      setLoading(true)
      setError(null)
      const bonData = await api.getBon(bonId)
      setBon(bonData)
      
      // Le bonType est déjà préchargé avec fields et fieldGroups par le backend
      if (bonData.bonType) {
        setBonType(bonData.bonType)
      } else if (bonData.bonTypeId) {
        // Fallback: charger le type de bon si non préchargé
        try {
          const bonTypeData = await api.getBonType(bonData.bonTypeId)
          setBonType(bonTypeData)
        } catch (err) {
          console.error('Error loading bon type:', err)
          // Ne pas bloquer si le type de bon ne peut pas être chargé
        }
      }
    } catch (err: any) {
      console.error('Error loading bon:', err)
      setError(err.message || 'Erreur lors du chargement du bon')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!bon) return
    try {
      setProcessing(true)
      // Le backend générera automatiquement le PDF s'il n'existe pas
      const blob = await api.downloadBonPDF(bon.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bon-${bon.bonNumber || bon.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      const errorMessage = error?.message || 'Erreur lors du téléchargement du PDF'
      alert(`Erreur lors du téléchargement du PDF: ${errorMessage}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleApprove = async () => {
    if (!bon) return
    if (!confirm('Êtes-vous sûr de vouloir approuver ce bon ?')) return

    try {
      setProcessing(true)
      await api.approveBon(bon.id)
      await loadBon() // Recharger les données
    } catch (err: any) {
      console.error('Error approving bon:', err)
      alert(err.message || 'Erreur lors de l\'approbation')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!bon) return
    const reason = prompt('Veuillez indiquer la raison du rejet :')
    if (!reason) return

    try {
      setProcessing(true)
      await api.rejectBon(bon.id, reason)
      await loadBon() // Recharger les données
    } catch (err: any) {
      console.error('Error rejecting bon:', err)
      alert(err.message || 'Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Brouillon", variant: "outline" },
      pending: { label: "En attente", variant: "secondary" },
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

  if (error || !bon) {
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
                <p>{error || 'Bon introuvable'}</p>
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
                Bon #{bon.bonNumber || bon.id}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                {bon.bonType?.name || 'Type de bon inconnu'}
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
            {bon.status === 'SUBMITTED' && (
              <>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 sm:flex-none"
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approuver
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
            )}
            {bon.status === 'DRAFT' && bon.createdBy === user?.id && (
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
                  onClick={() => setSignatureDialogOpen(true)}
                  disabled={processing}
                  className="flex-1 sm:flex-none"
                >
                  <FileSignature className="mr-2 h-4 w-4" />
                  Signer
                </Button>
              </>
            )}
            {/* Bouton pour signer si l'utilisateur est dans les signataires et peut signer */}
            {bon.status === 'DRAFT' && bon.createdBy !== user?.id && (
              <Button
                variant="default"
                onClick={() => setSignatureDialogOpen(true)}
                disabled={processing}
                className="flex-1 sm:flex-none"
              >
                <FileSignature className="mr-2 h-4 w-4" />
                Signer
              </Button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Statut :</span>
          {getStatusBadge(bon.status)}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Informations principales */}
          <Card className="md:col-span-2 lg:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du bon
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
                    {bon.creator?.fullName || bon.creator?.email || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Site
                  </div>
                  <p className="font-medium">{bon.siteName || bon.siteId || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date de création
                  </div>
                  <p className="font-medium">
                    {bon.createdAt
                      ? new Date(bon.createdAt).toLocaleDateString('fr-FR', {
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
                    {bon.updatedAt
                      ? new Date(bon.updatedAt).toLocaleDateString('fr-FR', {
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

              {/* Valeurs du bon */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Données du bon</h3>
                {bon.values && Object.keys(bon.values).length > 0 ? (() => {
                  // Créer un mapping complet des champs (nom technique -> label + type)
                  const fieldMap = new Map<string, { label: string; type?: string }>()
                  
                  // Mapper les champs simples (hors groupes)
                  if (bonType?.fields) {
                    bonType.fields.forEach((field: any) => {
                      if (!field.bonFieldGroupId) {
                        fieldMap.set(field.name, { 
                          label: field.label || field.name, 
                          type: field.type 
                        })
                      }
                    })
                  }
                  
                  // Mapper les champs dans les groupes
                  if (bonType?.fieldGroups) {
                    bonType.fieldGroups.forEach((group: any) => {
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
                  if (bonType?.fieldGroups) {
                    bonType.fieldGroups.forEach((group: any) => {
                      groupMap.set(group.name, {
                        label: group.label || group.name,
                        isRepeatable: group.isRepeatable || false,
                        fields: group.fields || [],
                        order: group.order || 0
                      })
                    })
                  }
                  
                  // Fonction pour formater une valeur selon son type
                  const formatValue = (value: any, fieldType?: string): string => {
                    if (value === undefined || value === null) {
                      return 'N/A'
                    }
                    
                    if (fieldType === 'checkbox') {
                      return value === true || value === 'true' || value === 1 || value === '1' ? 'Oui' : 'Non'
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
                    } else if (typeof value === 'object' && !Array.isArray(value)) {
                      // Objet complexe : afficher en JSON formaté
                      try {
                        return JSON.stringify(value, null, 2)
                      } catch (e) {
                        return String(value)
                      }
                    } else if (Array.isArray(value)) {
                      // Tableau : afficher comme liste
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
                  
                  Object.entries(bon.values).forEach(([key, value]) => {
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
                            const displayValue = formatValue(value, fieldInfo?.type)
                            
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-medium">{displayValue}</span>
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
                                                const displayValue = formatValue(fieldValue, fieldInfo?.type)
                                                
                                                return (
                                                  <div key={fieldName} className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{label}:</span>
                                                    <span className="font-medium">{displayValue}</span>
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
                                          const displayValue = formatValue(fieldValue, fieldInfo?.type)
                                          
                                          return (
                                            <div key={fieldName} className="flex justify-between text-sm">
                                              <span className="text-muted-foreground">{label}:</span>
                                              <span className="font-medium">{displayValue}</span>
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
                            
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-medium">{displayValue}</span>
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
                  <div className="text-xs text-muted-foreground mb-1">Type de bon</div>
                  <div className="font-medium">{bon.bonType?.name || 'N/A'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Version</div>
                  <div className="font-medium">v{bon.version || 1}</div>
                </div>
                {bon.signatures && bon.signatures.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Signatures</div>
                      <div className="space-y-2">
                        {bon.signatures.map((signature: any, index: number) => (
                          <div key={index} className="text-sm">
                            <div className="font-medium">{signature.user?.fullName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {signature.createdAt
                                ? new Date(signature.createdAt).toLocaleDateString('fr-FR')
                                : ''}
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
        </div>

        {/* Dialogs */}
        {bon && (
          <>
            <BonSignersDialog
              open={signersDialogOpen}
              onOpenChange={setSignersDialogOpen}
              bonId={bonId}
              onSuccess={() => {
                loadBon()
                setSignersDialogOpen(false)
              }}
            />
            <BonSignatureDialog
              open={signatureDialogOpen}
              onOpenChange={setSignatureDialogOpen}
              bonId={bonId}
              onSuccess={() => {
                loadBon()
                setSignatureDialogOpen(false)
              }}
            />
          </>
        )}
      </div>
    </DashboardShell>
  )
}

