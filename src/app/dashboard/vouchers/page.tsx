'use client'

import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Download, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PermissionGuard } from '@/components/permission-guard'
import { api, type Document, type DocumentType } from '@/lib/api'

export default function VouchersPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const limit = 10

  useEffect(() => {
    if (user) {
      loadDocumentTypes()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user, currentPage, statusFilter, documentTypeFilter])

  const loadDocumentTypes = async () => {
    try {
      const types = await api.getDocumentTypes()
      setDocumentTypes(types)
    } catch (error) {
      console.error('Error loading document types:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: currentPage,
        limit,
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (documentTypeFilter !== 'all') {
        params.documentTypeId = documentTypeFilter // Déjà une string, pas besoin de Number()
      }

      const response = await api.getDocuments(params)
      setDocuments(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.lastPage)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (documentId: string | number) => {
    try {
      setSaving(true)
      const blob = await api.downloadDocumentPDF(documentId)
      
      // Vérifier que le blob n'est pas vide
      if (!blob || blob.size === 0) {
        throw new Error('Le fichier PDF est vide')
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `document-${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      
      // Nettoyer après un court délai pour s'assurer que le téléchargement a commencé
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
      draft: { label: "Brouillon", variant: "outline" },
      pending: { label: "En attente", variant: "secondary" },
      signed: { label: "Signé", variant: "default" },
      approved: { label: "Approuvé", variant: "default" },
      rejected: { label: "Rejeté", variant: "destructive" },
    }
    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  // Recherche côté client pour l'instant (peut être améliorée avec recherche serveur)
  const filteredDocuments = searchQuery
    ? documents.filter(document => {
        const query = searchQuery.toLowerCase()
        return (
          document.documentNumber?.toLowerCase().includes(query) ||
          document.siteName?.toLowerCase().includes(query) ||
          document.documentType?.name?.toLowerCase().includes(query)
        )
      })
    : documents

  return (
    <PermissionGuard permission="document.read">
      <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.nav.documents || 'Documents'}</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Gérez vos documents numériques
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => router.push('/dashboard/vouchers/create')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer un document
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de document</label>
              <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatusFilter('all')
                  setDocumentTypeFilter('all')
                  setSearchQuery('')
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Liste des documents</CardTitle>
          <CardDescription className="text-sm">
            {total > 0 ? `${total} document(s) trouvé(s)` : 'Aucun document'}
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
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || documentTypeFilter !== 'all'
                  ? 'Aucun document ne correspond à vos critères de recherche'
                  : 'Aucun document trouvé'}
              </p>
              {(searchQuery || statusFilter !== 'all' || documentTypeFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setDocumentTypeFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Numéro</TableHead>
                      <TableHead className="min-w-[150px]">Type de document</TableHead>
                      <TableHead className="min-w-[100px]">Site</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="min-w-[120px]">Date de création</TableHead>
                      <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {document.documentNumber || `#${document.id}`}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{document.documentType?.name || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {document.siteName || document.siteId || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(document.status)}</TableCell>
                        <TableCell className="text-sm">
                          {document.createdAt
                            ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/dashboard/vouchers/${document.id}`)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadPDF(document.id)}
                              disabled={saving}
                              title="Télécharger le PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} • {total} document(s) au total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </PermissionGuard>
  )
}



