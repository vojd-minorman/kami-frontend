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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Eye, Loader2, Filter } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PermissionGuard } from '@/components/permission-guard'
import { api, type DocumentType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function DocumentTypesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadDocumentTypes()
    }
  }, [user])

  const loadDocumentTypes = async () => {
    try {
      setLoading(true)
      const types = await api.getDocumentTypes()
      setDocumentTypes(types)
    } catch (error) {
      console.error('Error loading document types:', error)
    } finally {
      setLoading(false)
    }
  }

  // Obtenir toutes les catégories uniques
  const categories = Array.from(
    new Map(
      documentTypes
        .filter(dt => dt.category)
        .map(dt => [dt.category!.id, dt.category!])
    ).values()
  )
  
  // Filtrer les types de documents par catégorie
  const filteredDocumentTypes = selectedCategory
    ? documentTypes.filter(dt => dt.category?.id === selectedCategory)
    : documentTypes

  const handleDelete = async (id: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de document ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting(id)
      await api.deleteDocumentType(id)
      await loadDocumentTypes()
    } catch (error: any) {
      console.error('Error deleting document type:', error)
      alert(error.message || 'Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Actif</Badge>
    }
    return <Badge variant="outline">Inactif</Badge>
  }

  return (
    <PermissionGuard permission="document_type.read">
      <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Types de documents</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les types de documents disponibles dans le système
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => router.push('/dashboard/document-types/create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer un type de document
          </Button>
        </div>

        {/* Document Types List */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">Liste des types de documents</CardTitle>
                <CardDescription className="text-sm">
                  {filteredDocumentTypes.length > 0 
                    ? `${filteredDocumentTypes.length} type(s) de document trouvé(s)${selectedCategory ? ` dans la catégorie "${categories.find(c => c.id === selectedCategory)?.name || ''}"` : ''}` 
                    : 'Aucun type de document'}
                </CardDescription>
              </div>
              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredDocumentTypes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucun type de document trouvé
                </p>
                <Button
                  onClick={() => router.push('/dashboard/document-types/create')}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre premier type de document
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nom</TableHead>
                      <TableHead className="min-w-[100px]">Code</TableHead>
                      <TableHead className="min-w-[150px]">Catégorie</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocumentTypes.map((documentType) => (
                      <TableRow key={documentType.id}>
                        <TableCell className="font-medium">{documentType.name}</TableCell>
                        <TableCell className="font-mono text-sm">{documentType.code}</TableCell>
                        <TableCell>
                          {documentType.category ? (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                              {documentType.category.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {documentType.description || 'Aucune description'}
                        </TableCell>
                        <TableCell>{getStatusBadge(documentType.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/templates/${documentType.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Gérer le template">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/document-types/${documentType.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(documentType.id)}
                              disabled={deleting === documentType.id}
                              title="Supprimer"
                            >
                              {deleting === documentType.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </DashboardShell>
    </PermissionGuard>
  )
}

