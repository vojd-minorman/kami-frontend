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
import { api, type Bon, type BonType } from '@/lib/api'

export default function VouchersPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const [bons, setBons] = useState<Bon[]>([])
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bonTypeFilter, setBonTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const limit = 10

  useEffect(() => {
    if (user) {
      loadBonTypes()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadBons()
    }
  }, [user, currentPage, statusFilter, bonTypeFilter])

  const loadBonTypes = async () => {
    try {
      const types = await api.getBonTypes()
      setBonTypes(types)
    } catch (error) {
      console.error('Error loading bon types:', error)
    }
  }

  const loadBons = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: currentPage,
        limit,
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (bonTypeFilter !== 'all') {
        params.bonTypeId = bonTypeFilter // Déjà une string, pas besoin de Number()
      }

      const response = await api.getBons(params)
      setBons(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.lastPage)
    } catch (error) {
      console.error('Error loading bons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (bonId: string | number) => {
    try {
      setSaving(true)
      const blob = await api.downloadBonPDF(bonId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bon-${bonId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Erreur lors du téléchargement du PDF')
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
  const filteredBons = searchQuery
    ? bons.filter(bon => {
        const query = searchQuery.toLowerCase()
        return (
          bon.bonNumber?.toLowerCase().includes(query) ||
          bon.siteName?.toLowerCase().includes(query) ||
          bon.bonType?.name?.toLowerCase().includes(query)
        )
      })
    : bons

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.nav.bons}</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Gérez vos bons numériques
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => router.push('/dashboard/vouchers/create')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer un bon
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
                  placeholder="Rechercher un bon..."
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
              <label className="text-sm font-medium">Type de bon</label>
              <Select value={bonTypeFilter} onValueChange={setBonTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {bonTypes.map((type) => (
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
                  setBonTypeFilter('all')
                  setSearchQuery('')
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bons List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Liste des bons</CardTitle>
          <CardDescription className="text-sm">
            {total > 0 ? `${total} bon(s) trouvé(s)` : 'Aucun bon'}
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
          ) : filteredBons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || bonTypeFilter !== 'all'
                  ? 'Aucun bon ne correspond à vos critères de recherche'
                  : 'Aucun bon trouvé'}
              </p>
              {(searchQuery || statusFilter !== 'all' || bonTypeFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setBonTypeFilter('all')
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
                      <TableHead className="min-w-[150px]">Type de bon</TableHead>
                      <TableHead className="min-w-[100px]">Site</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="min-w-[120px]">Date de création</TableHead>
                      <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBons.map((bon) => (
                      <TableRow key={bon.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {bon.bonNumber || `#${bon.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{bon.bonType?.name || 'N/A'}</span>
                            {bon.bonType?.code && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {bon.bonType.code}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {bon.siteName || bon.siteId || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(bon.status)}</TableCell>
                        <TableCell className="text-sm">
                          {bon.createdAt
                            ? new Date(bon.createdAt).toLocaleDateString('fr-FR', {
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
                              onClick={() => router.push(`/dashboard/vouchers/${bon.id}`)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadPDF(bon.id)}
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
                    Page {currentPage} sur {totalPages} • {total} bon(s) au total
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
  )
}



