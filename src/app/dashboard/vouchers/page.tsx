'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Download, Search, Filter, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { PermissionGuard } from '@/components/permission-guard'
import { api, type Document, type DocumentType } from '@/lib/api'
import { MultiSelect } from '@/components/ui/multi-select'
import { DateRangePicker } from '@/components/date-range-picker'
import { Label } from '@/components/ui/label'

const STATUS_OPTIONS = [
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Soumis', value: 'SUBMITTED' },
  { label: 'En cours', value: 'IN_PROGRESS' },
  { label: 'Validé', value: 'VALIDATED' },
  { label: 'Signé', value: 'SIGNED' },
  { label: 'Actif', value: 'ACTIVE' },
  { label: 'Expiré', value: 'EXPIRED' },
  { label: 'Annulé', value: 'CANCELLED' },
  { label: 'Utilisé', value: 'USED' },
]

export default function VouchersPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  // Filtres
  const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([])
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<(string | number)[]>([])
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  
  const limit = 50
  const observerTarget = useRef<HTMLDivElement>(null)

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

  const loadDocuments = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setDocuments([]) // Réinitialiser la liste lors d'une nouvelle recherche
      }
      
      const params: any = {
        page,
        limit,
      }
      
      if (selectedStatuses.length > 0) {
        params.status = selectedStatuses
      }
      
      if (selectedDocumentTypes.length > 0) {
        params.documentTypeId = selectedDocumentTypes
      }
      
      if (dateFrom) {
        params.dateFrom = dateFrom
      }
      
      if (dateTo) {
        params.dateTo = dateTo
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const response = await api.getDocuments(params)
      
      if (append) {
        setDocuments(prev => [...prev, ...response.data])
      } else {
        setDocuments(response.data)
      }
      
      setTotal(response.meta.total)
      setHasMore(response.data.length === limit && response.meta.currentPage < response.meta.lastPage)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedStatuses, selectedDocumentTypes, dateFrom, dateTo, searchQuery, limit])

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadDocuments(currentPage + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerTarget.current)

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading, loadingMore, currentPage, loadDocuments])

  // Charger les types de documents au montage
  useEffect(() => {
    if (user && hasPermission('document_type.read')) {
      loadDocumentTypes()
    }
  }, [user, hasPermission, loadDocumentTypes])

  // Recharger les documents lorsque les filtres changent
  useEffect(() => {
    if (user) {
      // Debounce pour la recherche
      const timeoutId = setTimeout(() => {
        loadDocuments(1, false)
      }, searchQuery ? 500 : 0)

      return () => clearTimeout(timeoutId)
    }
  }, [user, selectedStatuses, selectedDocumentTypes, dateFrom, dateTo, searchQuery])

  // Écouter les événements WebSocket
  useEffect(() => {
    if (!user) return

    const handleDocumentCreated = (event: CustomEvent) => {
      console.log('📄 [Vouchers] Événement document:created reçu:', event.detail)
      if (currentPage === 1 && selectedStatuses.length === 0 && selectedDocumentTypes.length === 0 && !searchQuery) {
        loadDocuments(1, false)
      }
    }

    const handleDocumentSigned = (event: CustomEvent) => {
      console.log('✍️ [Vouchers] Événement document:signed reçu:', event.detail)
      const signedData = event.detail
      setDocuments(prev => prev.map(doc => 
        doc.id === signedData.documentId 
          ? { ...doc, status: signedData.status }
          : doc
      ))
    }

    const handleDocumentStatusChanged = (event: CustomEvent) => {
      console.log('📊 [Vouchers] Événement document:status_changed reçu:', event.detail)
      const statusData = event.detail
      setDocuments(prev => prev.map(doc => 
        doc.id === statusData.documentId 
          ? { ...doc, status: statusData.status }
          : doc
      ))
    }

    const handleDocumentUpdated = (event: CustomEvent) => {
      console.log('🔄 [Vouchers] Événement document:updated reçu:', event.detail)
      const updatedData = event.detail
      setDocuments(prev => prev.map(doc => 
        doc.id === updatedData.documentId 
          ? { ...doc, ...updatedData }
          : doc
      ))
    }

    window.addEventListener('document:created', handleDocumentCreated as EventListener)
    window.addEventListener('document:signed', handleDocumentSigned as EventListener)
    window.addEventListener('document:status_changed', handleDocumentStatusChanged as EventListener)
    window.addEventListener('document:updated', handleDocumentUpdated as EventListener)

    return () => {
      window.removeEventListener('document:created', handleDocumentCreated as EventListener)
      window.removeEventListener('document:signed', handleDocumentSigned as EventListener)
      window.removeEventListener('document:status_changed', handleDocumentStatusChanged as EventListener)
      window.removeEventListener('document:updated', handleDocumentUpdated as EventListener)
    }
  }, [user, currentPage, selectedStatuses, selectedDocumentTypes, searchQuery, loadDocuments])

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

  const handleResetFilters = () => {
    setSelectedStatuses([])
    setSelectedDocumentTypes([])
    setDateFrom(undefined)
    setDateTo(undefined)
    setSearchQuery('')
  }

  const hasActiveFilters = selectedStatuses.length > 0 || 
                           selectedDocumentTypes.length > 0 || 
                           dateFrom || 
                           dateTo || 
                           searchQuery.trim().length > 0

  const documentTypeOptions = documentTypes.map(type => ({
    label: type.name,
    value: type.id,
  }))

  return (
    <PermissionGuard permission="document.read">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t.nav.documents || 'Documents'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez vos documents numériques
            </p>
          </div>
          {hasPermission('document.create') && (
            <Button 
              className="w-full sm:w-auto"
              onClick={() => router.push('/dashboard/vouchers/create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer un document
            </Button>
          )}
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
                      selectedStatuses.length > 0 && `${selectedStatuses.length} statut(s)`,
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
              
              <div className="space-y-2 min-w-[200px] flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.67rem)] xl:basis-auto">
                <Label className="text-sm font-medium">Statuts</Label>
                <MultiSelect
                  options={STATUS_OPTIONS}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="Tous les statuts"
                  className="w-full"
                />
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
          <CardTitle className="text-lg md:text-xl">Liste des documents</CardTitle>
          <CardDescription className="text-sm break-words">
            {total > 0 ? `${total} document(s) trouvé(s)` : 'Aucun document'}
            {documents.length > 0 && documents.length < total && (
              <span className="ml-2 text-muted-foreground whitespace-nowrap">
                ({documents.length} affiché(s))
              </span>
            )}
          </CardDescription>
        </CardHeader>
          <CardContent>
            {loading && documents.length === 0 ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? 'Aucun document ne correspond à vos critères de recherche'
                    : 'Aucun document trouvé'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                  >
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
                        <TableHead className="min-w-[120px] sm:min-w-[150px] hidden sm:table-cell">Initiateur</TableHead>
                        <TableHead className="min-w-[80px] sm:min-w-[100px]">Statut</TableHead>
                        <TableHead className="min-w-[110px] sm:min-w-[140px]">Date</TableHead>
                        <TableHead className="text-right min-w-[100px] sm:min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="font-medium font-mono text-xs sm:text-sm break-all sm:break-normal">
                            {document.documentNumber || `#${document.id}`}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div>
                              <span className="font-medium truncate block max-w-[150px]">
                                {document.documentType?.name || 'N/A'}
                              </span>
                              <span className="text-[10px] text-muted-foreground sm:hidden truncate block max-w-[150px] mt-0.5">
                                {document.creator?.fullName || document.creator?.email || ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                            <span className="truncate block max-w-[150px]">
                              {document.creator?.fullName || document.creator?.email || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="hidden sm:block">
                              {getStatusBadge(document.status)}
                            </div>
                            <div className="sm:hidden">
                              <Badge variant={getStatusBadge(document.status).props.variant} className="text-[10px] px-1.5 py-0">
                                {getStatusBadge(document.status).props.children}
                              </Badge>
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
                                onClick={() => router.push(`/dashboard/vouchers/${document.id}`)}
                                title="Voir les détails"
                              >
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleDownloadPDF(document.id)}
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

                {/* Infinite scroll trigger & loading indicator */}
                <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement de plus de documents...
                    </div>
                  )}
                  {!hasMore && documents.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Tous les documents ont été chargés
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
