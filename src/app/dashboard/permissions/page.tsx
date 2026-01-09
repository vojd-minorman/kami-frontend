'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Separator } from '@/components/ui/separator'
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2,
  Search,
  Shield,
  FileText,
} from 'lucide-react'
import { api } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { PermissionGuard } from '@/components/permission-guard'

interface Permission {
  id: string
  name: string
  code: string
  description?: string
  resource?: string
  action: string
  documentTypeId?: string
  roles?: any[]
}

interface DocumentType {
  id: string
  name: string
  code: string
}

export default function PermissionsPage() {
  const { t } = useLocale()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    resource: '',
    action: '',
    documentTypeId: '',
  })

  useEffect(() => {
    loadPermissions()
    loadDocumentTypes()
  }, [])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const permissionsData = await api.getPermissions()
      setPermissions(permissionsData)
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentTypes = async () => {
    try {
      setLoadingDocumentTypes(true)
      const documentTypesData = await api.getDocumentTypes()
      setDocumentTypes(documentTypesData)
    } catch (error) {
      console.error('Error loading document types:', error)
    } finally {
      setLoadingDocumentTypes(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      resource: '',
      action: '',
      documentTypeId: '',
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission)
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      resource: permission.resource || '',
      action: permission.action,
      documentTypeId: permission.documentTypeId || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSavePermission = async () => {
    try {
      setProcessing(true)
      
      const payload: any = {
        name: formData.name,
        description: formData.description,
        resource: formData.resource || null,
        action: formData.action,
      }

      if (formData.documentTypeId) {
        payload.documentTypeId = formData.documentTypeId
      }

      if (editingPermission) {
        // Mise à jour
        await api.updatePermission(editingPermission.id, payload)
      } else {
        // Création
        await api.createPermission({
          ...payload,
          code: formData.code,
        })
      }
      
      setIsEditDialogOpen(false)
      setIsCreateDialogOpen(false)
      await loadPermissions()
    } catch (error: any) {
      console.error('Error saving permission:', error)
      alert(error.message || 'Erreur lors de la sauvegarde')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (permission: Permission) => {
    if (permission.roles && permission.roles.length > 0) {
      alert('Cette permission est utilisée par des rôles et ne peut pas être supprimée')
      return
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la permission "${permission.name}" ?`)) {
      return
    }

    try {
      setProcessing(true)
      await api.deletePermission(permission.id)
      await loadPermissions()
    } catch (error: any) {
      console.error('Error deleting permission:', error)
      alert(error.message || 'Erreur lors de la suppression')
    } finally {
      setProcessing(false)
    }
  }

  const generateCode = (name: string, resource?: string, action?: string) => {
    if (resource && action) {
      return `${resource}.${action}`.toLowerCase()
    }
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  const handleResourceActionChange = () => {
    if (formData.resource && formData.action) {
      setFormData({
        ...formData,
        code: generateCode(formData.name, formData.resource, formData.action),
      })
    }
  }

  const filteredPermissions = permissions.filter(permission => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        permission.name.toLowerCase().includes(query) ||
        permission.code.toLowerCase().includes(query) ||
        permission.description?.toLowerCase().includes(query) ||
        permission.resource?.toLowerCase().includes(query) ||
        permission.action.toLowerCase().includes(query)
      )
    }
    if (resourceFilter !== 'all') {
      return permission.resource === resourceFilter
    }
    return true
  })

  // Obtenir la liste unique des ressources
  const resources = Array.from(new Set(permissions.map(p => p.resource).filter(Boolean)))

  const actions = [
    { value: 'create', label: 'Créer' },
    { value: 'read', label: 'Lire' },
    { value: 'update', label: 'Modifier' },
    { value: 'delete', label: 'Supprimer' },
    { value: 'sign', label: 'Signer' },
    { value: 'approve', label: 'Approuver' },
    { value: 'reject', label: 'Rejeter' },
    { value: 'view', label: 'Voir' },
    { value: 'manage', label: 'Gérer' },
  ]

  return (
    <PermissionGuard permission="permission.read">
      <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion des permissions</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Créez et gérez les permissions du système
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une permission
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une permission..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les ressources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les ressources</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Permissions List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Permissions</CardTitle>
            <CardDescription className="text-sm">
              {filteredPermissions.length} permission(s) trouvée(s)
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
            ) : filteredPermissions.length === 0 ? (
              <div className="text-center py-12">
                <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || resourceFilter !== 'all'
                    ? 'Aucune permission ne correspond à votre recherche'
                    : 'Aucune permission trouvée'}
                </p>
                {!searchQuery && resourceFilter === 'all' && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer la première permission
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nom</TableHead>
                      <TableHead className="min-w-[150px]">Code</TableHead>
                      <TableHead className="min-w-[120px]">Ressource</TableHead>
                      <TableHead className="min-w-[100px]">Action</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[150px]">Type de document</TableHead>
                      <TableHead className="min-w-[100px]">Rôles</TableHead>
                      <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-primary" />
                            <span className="font-medium">{permission.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{permission.code}</code>
                        </TableCell>
                        <TableCell>
                          {permission.resource ? (
                            <Badge variant="outline">{permission.resource}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{permission.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {permission.description || 'Aucune description'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {permission.documentTypeId ? (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Spécifique
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Générale</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {permission.roles && permission.roles.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {permission.roles.length} rôle(s)
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucun</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(permission)}
                              disabled={processing}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(permission)}
                              disabled={processing || (permission.roles && permission.roles.length > 0)}
                              className="text-red-600 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open)
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingPermission(null)
          setFormData({
            name: '',
            code: '',
            description: '',
            resource: '',
            action: '',
            documentTypeId: '',
          })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPermission ? 'Modifier la permission' : 'Créer une permission'}</DialogTitle>
            <DialogDescription>
              {editingPermission ? 'Modifiez les informations de la permission' : 'Remplissez les informations pour créer une nouvelle permission'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la permission *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Créer un document"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="document.create"
                required
                disabled={!!editingPermission}
              />
              <p className="text-xs text-muted-foreground">
                Le code est généré automatiquement à partir de la ressource et de l'action. Il doit être unique.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Permet de créer de nouveaux documents"
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resource">Ressource</Label>
                <Input
                  id="resource"
                  value={formData.resource}
                  onChange={(e) => {
                    setFormData({ ...formData, resource: e.target.value })
                    handleResourceActionChange()
                  }}
                  placeholder="document"
                />
                <p className="text-xs text-muted-foreground">
                  Ex: document, user, role, permission
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Select 
                  value={formData.action} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, action: value })
                    handleResourceActionChange()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentTypeId">Type de document (optionnel)</Label>
              <Select 
                value={formData.documentTypeId} 
                onValueChange={(value) => setFormData({ ...formData, documentTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Permission générale (tous les types)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Permission générale</SelectItem>
                  {loadingDocumentTypes ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : (
                    documentTypes.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si sélectionné, cette permission sera spécifique à ce type de document
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setIsEditDialogOpen(false)
            }}>
              Annuler
            </Button>
            <Button onClick={handleSavePermission} disabled={processing || !formData.name || !formData.code || !formData.action}>
              {processing ? 'Enregistrement...' : editingPermission ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardShell>
    </PermissionGuard>
  )
}
