"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MultiSelect } from "@/components/ui/multi-select"
import { DateRangePicker } from "@/components/date-range-picker"
import { Label } from "@/components/ui/label"
import { FileSignature, Eye, Download, Search, Filter, X, Loader2, Clock, User, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { api, type DocumentType } from "@/lib/api"
import { PermissionGuard } from "@/components/permission-guard"
import { usePermissions } from "@/hooks/use-permissions"

interface PendingSignatureDocument {
  id: string
  documentNumber: string
  documentType: {
    id: string
    name: string
  } | null
  status: string
  createdAt: string
  creator: {
    id: string
    fullName: string
  } | null
  lastSigner: {
    id: string
    fullName: string
    signedAt: string
  } | null
  totalSigners: number
  signedCount: number
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Brouillon", variant: "outline" },
    SUBMITTED: { label: "Soumis", variant: "secondary" },
    IN_PROGRESS: { label: "En cours", variant: "secondary" },
    VALIDATED: { label: "Validé", variant: "default" },
    SIGNED: { label: "Signé", variant: "default" },
    ACTIVE: { label: "Actif", variant: "default" },
    EXPIRED: { label: "Expiré", variant: "destructive" },
    CANCELLED: { label: "Annulé", variant: "destructive" },
    USED: { label: "Utilisé", variant: "secondary" },
  }
  const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
}

export default function PendingSignaturesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [documents, setDocuments] = useState<PendingSignatureDocument[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtres
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<(string | number)[]>([])
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')

  const loadDocumentTypes = useCallback(async () => {
    if (!hasPermission('document_type.read')) {
      return
    }
    
    try {
      const types = await api.getDocumentTypes()
      setDocumentTypes(types)
    } catch (error) {
      console.error('Error loading document types:', error)
    }
  }, [hasPermission])

  const loadPendingSignatures = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const response = await api.getPendingSignatures()
      let filteredDocs = response.documents

      // Filtrer par type de document
      if (selectedDocumentTypes.length > 0) {
        filteredDocs = filteredDocs.filter(doc => 
          doc.documentType && selectedDocumentTypes.includes(doc.documentType.id)
        )
      }

      // Filtrer par date
      if (dateFrom) {
        filteredDocs = filteredDocs.filter(doc => 
          new Date(doc.createdAt) >= new Date(dateFrom)
        )
      }
      if (dateTo) {
        filteredDocs = filteredDocs.filter(doc => 
          new Date(doc.createdAt) <= new Date(dateTo)
        )
      }

      // Filtrer par recherche
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredDocs = filteredDocs.filter(doc =>
          doc.documentNumber.toLowerCase().includes(query) ||
          doc.documentType?.name.toLowerCase().includes(query) ||
          doc.creator?.fullName.toLowerCase().includes(query) ||
          doc.lastSigner?.fullName.toLowerCase().includes(query)
        )
      }

      setDocuments(filteredDocs)
    } catch (err: any) {
      console.error("Erreur lors du chargement des documents en attente:", err)
      setError(err.message || "Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }, [user, selectedDocumentTypes, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    if (user) {
      loadDocumentTypes()
      loadPendingSignatures()
    }
  }, [user, loadDocumentTypes, loadPendingSignatures])

  // Écouter les événements WebSocket pour mettre à jour la liste en temps réel
  useEffect(() => {
    if (!user) return

    const handleDocumentSigned = () => {
      console.log("✍️ [PendingSignatures] Document signé, rechargement de la liste")
      loadPendingSignatures()
    }

    const handleDocumentStatusChanged = () => {
      console.log("📊 [PendingSignatures] Statut document changé, rechargement de la liste")
      loadPendingSignatures()
    }

    const handleDocumentUpdated = () => {
      console.log("🔄 [PendingSignatures] Document mis à jour, rechargement de la liste")
      loadPendingSignatures()
    }

    const handleDocumentCreated = () => {
      console.log("📄 [PendingSignatures] Document créé, rechargement de la liste")
      loadPendingSignatures()
    }

    window.addEventListener("document:signed", handleDocumentSigned as EventListener)
    window.addEventListener("document:status_changed", handleDocumentStatusChanged as EventListener)
    window.addEventListener("document:updated", handleDocumentUpdated as EventListener)
    window.addEventListener("document:created", handleDocumentCreated as EventListener)

    return () => {
      window.removeEventListener("document:signed", handleDocumentSigned as EventListener)
      window.removeEventListener("document:status_changed", handleDocumentStatusChanged as EventListener)
      window.removeEventListener("document:updated", handleDocumentUpdated as EventListener)
      window.removeEventListener("document:created", handleDocumentCreated as EventListener)
    }
  }, [user, loadPendingSignatures])

  const handleOpenDocument = (documentId: string) => {
    router.push(`/dashboard/vouchers/${documentId}`)
  }

  const handleDownloadPDF = async (documentId: string | number) => {
    try {
      setSaving(true)
      const blob = await api.downloadDocumentPDF(documentId)
      
      if (!blob || blob.size === 0) {
        throw new Error('Le fichier PDF est vide')
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `document-${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      const errorMessage = error?.message || 'Erreur lors du téléchargement du PDF'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleResetFilters = () => {
    setSelectedDocumentTypes([])
    setDateFrom(undefined)
    setDateTo(undefined)
    setSearchQuery('')
  }

  const hasActiveFilters = selectedDocumentTypes.length > 0 || 
                           dateFrom || 
                           dateTo || 
                           searchQuery.trim().length > 0

  const documentTypeOptions = documentTypes.map(type => ({
    label: type.name,
    value: type.id,
  }))

  return (
    <PermissionGuard permission="document.sign">
      <DashboardShell>
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileSignature className="h-6 w-6 md:h-8 md:w-8" />
                Documents en attente de signature
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Documents nécessitant votre signature
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 flex-shrink-0" />
                  Filtres avancés
                </span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-0 sm:ml-2 mt-1 sm:mt-0">
                    <span className="truncate max-w-[200px] sm:max-w-none">
                      {[
                        selectedDocumentTypes.length > 0 && `${selectedDocumentTypes.length} type(s)`,
                        (dateFrom || dateTo) && 'Dates',
                        searchQuery && 'Recherche',
                      ].filter(Boolean).join(', ')}
                    </span>
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-hidden">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2 min-w-[200px] flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.67rem)] xl:basis-auto">
                  <Label className="text-sm font-medium">Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Numéro, créateur, type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                </div>
                
                {hasPermission('document_type.read') && (
                  <div className="space-y-2 min-w-[200px] flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.67rem)] xl:basis-auto">
                    <Label className="text-sm font-medium">Types de documents</Label>
                    <MultiSelect
                      options={documentTypeOptions}
                      selected={selectedDocumentTypes}
                      onChange={setSelectedDocumentTypes}
                      placeholder="Tous les types"
                      className="w-full"
                    />
                  </div>
                )}
                
                <div className="space-y-2 min-w-[280px] flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.67rem)] xl:basis-auto">
                  <DateRangePicker
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    className="w-full"
                  />
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Mes signatures en attente</CardTitle>
              <CardDescription className="text-sm break-words">
                {loading
                  ? "Chargement..."
                  : documents.length > 0
                    ? `${documents.length} document(s) en attente de votre signature`
                    : hasActiveFilters
                      ? "Aucun document ne correspond à vos critères de recherche"
                      : "Aucun document en attente de signature"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 py-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 flex-1" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={loadPendingSignatures}>
                    Réessayer
                  </Button>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {hasActiveFilters
                      ? "Aucun document ne correspond à vos critères"
                      : "Aucun document en attente"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={handleResetFilters} className="mt-4">
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[100px] sm:min-w-[120px]">Numéro</TableHead>
                            <TableHead className="min-w-[120px] sm:min-w-[150px]">Type</TableHead>
                            <TableHead className="min-w-[120px] sm:min-w-[150px] hidden sm:table-cell">Créateur</TableHead>
                            <TableHead className="min-w-[120px] sm:min-w-[150px] hidden md:table-cell">Dernier signataire</TableHead>
                            <TableHead className="min-w-[100px] sm:min-w-[120px]">Progression</TableHead>
                            <TableHead className="min-w-[110px] sm:min-w-[140px]">Date</TableHead>
                            <TableHead className="text-right min-w-[100px] sm:min-w-[120px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((document) => (
                            <TableRow key={document.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium font-mono text-xs sm:text-sm break-all sm:break-normal">
                                {document.documentNumber || `#${document.id}`}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div>
                                  <span className="font-medium truncate block max-w-[150px]">
                                    {document.documentType?.name || 'N/A'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground sm:hidden truncate block max-w-[150px] mt-0.5">
                                    {document.creator?.fullName || ''}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate block max-w-[150px]">
                                    {document.creator?.fullName || 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                                {document.lastSigner ? (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span className="truncate block max-w-[150px]">
                                      {document.lastSigner.fullName}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3 text-yellow-500" />
                                    <span>Aucune</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                  <FileSignature className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {document.signedCount}/{document.totalSigners}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                <div className="hidden sm:block">
                                  {document.createdAt
                                    ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'N/A'}
                                </div>
                                <div className="sm:hidden">
                                  {document.createdAt
                                    ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1 sm:gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenDocument(document.id)
                                    }}
                                    title="Ouvrir pour signer"
                                  >
                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDownloadPDF(document.id)
                                    }}
                                    disabled={saving}
                                    title="Télécharger le PDF"
                                  >
                                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </PermissionGuard>
  )
}
