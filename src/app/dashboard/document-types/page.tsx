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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Eye, Loader2, Filter, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { PermissionGuard } from '@/components/permission-guard'
import { api, type DocumentType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function DocumentTypesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    if (user) {
      loadDocumentTypes()
    }
  }, [user])

  // Écouter les événements WebSocket pour mettre à jour la liste des types de documents en temps réel
  useEffect(() => {
    if (!user) return

    const handleDocumentTypeCreated = (event: CustomEvent) => {
      console.log('📋 [DocumentTypes] Événement document_type:created reçu:', event.detail)
      loadDocumentTypes()
    }

    const handleDocumentTypeUpdated = (event: CustomEvent) => {
      console.log('📋 [DocumentTypes] Événement document_type:updated reçu:', event.detail)
      const updatedData = event.detail
      // Mettre à jour le type de document dans la liste
      setDocumentTypes(prev => prev.map(dt => 
        dt.id === updatedData.documentTypeId 
          ? { ...dt, ...updatedData }
          : dt
      ))
      // Rafraîchir pour avoir les données complètes
      loadDocumentTypes()
    }

    const handleDocumentTypeDeleted = (event: CustomEvent) => {
      console.log('📋 [DocumentTypes] Événement document_type:deleted reçu:', event.detail)
      const deletedData = event.detail
      // Retirer le type de document de la liste
      setDocumentTypes(prev => prev.filter(dt => dt.id !== deletedData.documentTypeId))
    }

    // Écouter les événements personnalisés
    window.addEventListener('document_type:created', handleDocumentTypeCreated as EventListener)
    window.addEventListener('document_type:updated', handleDocumentTypeUpdated as EventListener)
    window.addEventListener('document_type:deleted', handleDocumentTypeDeleted as EventListener)

    return () => {
      window.removeEventListener('document_type:created', handleDocumentTypeCreated as EventListener)
      window.removeEventListener('document_type:updated', handleDocumentTypeUpdated as EventListener)
      window.removeEventListener('document_type:deleted', handleDocumentTypeDeleted as EventListener)
    }
  }, [user])

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setImportError('Le fichier doit être un fichier JSON (.json)')
        setImportFile(null)
        return
      }
      setImportFile(file)
      setImportError(null)
      setImportSuccess(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Veuillez sélectionner un fichier')
      return
    }

    try {
      setImporting(true)
      setImportError(null)
      setImportSuccess(null)

      // Lire le contenu du fichier
      const fileContent = await importFile.text()
      const importData = JSON.parse(fileContent)

      // Vérifier la structure de base
      if (!importData.documentType || !importData.fieldGroups) {
        throw new Error('Format de fichier invalide. Le fichier doit contenir "documentType" et "fieldGroups"')
      }

      // Importer via l'API
      const importedDocumentType = await api.importDocumentType(importData)

      setImportSuccess(`Type de document "${importedDocumentType.name}" importé avec succès !`)
      
      // Recharger la liste
      await loadDocumentTypes()

      // Fermer le dialog après 2 secondes
      setTimeout(() => {
        setShowImportDialog(false)
        setImportFile(null)
        setImportSuccess(null)
        setImportError(null)
      }, 2000)

    } catch (error: any) {
      console.error('Error importing document type:', error)
      setImportError(error.message || 'Erreur lors de l\'importation du fichier JSON')
    } finally {
      setImporting(false)
    }
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
          {hasPermission('document_type.create') && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importer un JSON
              </Button>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => router.push('/dashboard/document-types/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un type de document
              </Button>
            </div>
          )}
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
                {hasPermission('document_type.create') && (
                  <Button
                    onClick={() => router.push('/dashboard/document-types/create')}
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer votre premier type de document
                  </Button>
                )}
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
                            {hasPermission('template.read') && (
                              <Link href={`/dashboard/templates/${documentType.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Gérer le template">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {hasPermission('document_type.update') && (
                              <Link href={`/dashboard/document-types/${documentType.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {hasPermission('document_type.delete') && (
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
                            )}
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

      {/* Dialog d'importation */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importer un type de document</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier JSON contenant la définition d'un type de document.
              Le fichier doit respecter le format d'importation (documentType + fieldGroups).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="import-file" className="text-sm font-medium">
                Fichier JSON
              </label>
              <input
                id="import-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={importing}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  Fichier sélectionné : <span className="font-mono">{importFile.name}</span> ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {importError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Erreur d'importation</p>
                    <p className="text-sm text-destructive/80 mt-1">{importError}</p>
                  </div>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-500">Importation réussie</p>
                    <p className="text-sm text-green-500/80 mt-1">{importSuccess}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-500/80">
                <strong>Note :</strong> Après l'importation, n'oubliez pas de configurer les workflows et les rôles requis dans la page d'édition du type de document.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false)
                setImportFile(null)
                setImportError(null)
                setImportSuccess(null)
              }}
              disabled={importing}
            >
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importation en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardShell>
    </PermissionGuard>
  )
}

