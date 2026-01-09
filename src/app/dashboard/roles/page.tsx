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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2,
  Key,
  Users,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react'
import { api } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { PermissionGuard } from '@/components/permission-guard'

interface Role {
  id: string
  name: string
  code: string
  description?: string
  isSystem?: boolean
  isActive?: boolean
  permissions?: Permission[]
}

interface Permission {
  id: string
  name: string
  code: string
  description?: string
  resource?: string
  action: string
  documentTypeId?: string
}

export default function RolesPage() {
  const { t } = useLocale()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  })
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const rolesData = await api.getRoles()
      setRoles(rolesData)
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true)
      const permissionsData = await api.getPermissions()
      setPermissions(permissionsData)
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
    })
    setSelectedPermissionIds([])
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
    })
    setSelectedPermissionIds(role.permissions?.map(p => p.id) || [])
    setIsEditDialogOpen(true)
  }

  const handleManagePermissions = (role: Role) => {
    setEditingRole(role)
    setSelectedPermissionIds(role.permissions?.map(p => p.id) || [])
    setIsPermissionsDialogOpen(true)
  }

  const handleSaveRole = async () => {
    try {
      setProcessing(true)
      
      if (editingRole) {
        // Mise à jour
        await api.updateRole(editingRole.id, {
          name: formData.name,
          description: formData.description,
          permissionIds: selectedPermissionIds,
        })
      } else {
        // Création
        await api.createRole({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          permissionIds: selectedPermissionIds,
        })
      }
      
      setIsEditDialogOpen(false)
      setIsCreateDialogOpen(false)
      await loadRoles()
    } catch (error: any) {
      console.error('Error saving role:', error)
      alert(error.message || 'Erreur lors de la sauvegarde')
    } finally {
      setProcessing(false)
    }
  }

  const handleSavePermissions = async () => {
    if (!editingRole) return
    
    try {
      setProcessing(true)
      await api.attachRolePermissions(editingRole.id, selectedPermissionIds)
      setIsPermissionsDialogOpen(false)
      await loadRoles()
    } catch (error: any) {
      console.error('Error saving permissions:', error)
      alert(error.message || 'Erreur lors de la sauvegarde')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      alert('Les rôles système ne peuvent pas être supprimés')
      return
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) {
      return
    }

    try {
      setProcessing(true)
      await api.deleteRole(role.id)
      await loadRoles()
    } catch (error: any) {
      console.error('Error deleting role:', error)
      alert(error.message || 'Erreur lors de la suppression')
    } finally {
      setProcessing(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const generateCode = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      code: generateCode(name),
    })
  }

  const filteredRoles = roles.filter(role => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        role.name.toLowerCase().includes(query) ||
        role.code.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Grouper les permissions par ressource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    const resource = perm.resource || 'general'
    if (!acc[resource]) {
      acc[resource] = []
    }
    acc[resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <PermissionGuard permission="role.read">
      <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion des rôles</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Créez et gérez les rôles et leurs permissions
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un rôle
          </Button>
        </div>

        {/* Search */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un rôle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Roles List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Rôles</CardTitle>
            <CardDescription className="text-sm">
              {filteredRoles.length} rôle(s) trouvé(s)
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
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Aucun rôle ne correspond à votre recherche'
                    : 'Aucun rôle trouvé'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer le premier rôle
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
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[150px]">Permissions</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium">{role.name}</div>
                              {role.isSystem && (
                                <Badge variant="outline" className="text-xs mt-1">Système</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{role.code}</code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {role.description || 'Aucune description'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {role.permissions && role.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {role.permissions.length} permission(s)
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucune</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {role.isActive !== false ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManagePermissions(role)}
                              disabled={processing}
                              title="Gérer les permissions"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(role)}
                              disabled={processing || role.isSystem}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(role)}
                              disabled={processing || role.isSystem}
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
          setEditingRole(null)
          setFormData({
            name: '',
            code: '',
            description: '',
          })
          setSelectedPermissionIds([])
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Créer un rôle'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Modifiez les informations du rôle' : 'Remplissez les informations pour créer un nouveau rôle'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du rôle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Gestionnaire de documents"
                required
                disabled={!!editingRole}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="document_manager"
                required
                disabled={!!editingRole}
              />
              <p className="text-xs text-muted-foreground">
                Le code est généré automatiquement à partir du nom. Il doit être unique et en minuscules.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du rôle..."
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                {loadingPermissions ? (
                  <div className="text-sm text-muted-foreground">Chargement des permissions...</div>
                ) : permissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune permission disponible</div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(permissionsByResource).map(([resource, perms]) => (
                      <div key={resource}>
                        <h4 className="text-sm font-semibold mb-2 capitalize">{resource}</h4>
                        <div className="space-y-2 pl-4">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`perm-${perm.id}`}
                                checked={selectedPermissionIds.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <Label
                                htmlFor={`perm-${perm.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{perm.name}</span>
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {perm.action}
                                  </Badge>
                                </div>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setIsEditDialogOpen(false)
            }}>
              Annuler
            </Button>
            <Button onClick={handleSaveRole} disabled={processing || !formData.name || !formData.code}>
              {processing ? 'Enregistrement...' : editingRole ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les permissions du rôle "{editingRole?.name}"</DialogTitle>
            <DialogDescription>
              Sélectionnez les permissions à assigner à ce rôle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingPermissions ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Chargement des permissions...</div>
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Aucune permission disponible</div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(permissionsByResource).map(([resource, perms]) => (
                  <div key={resource} className="border rounded-md p-4">
                    <h4 className="text-sm font-semibold mb-3 capitalize">{resource}</h4>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50">
                          <Checkbox
                            id={`manage-perm-${perm.id}`}
                            checked={selectedPermissionIds.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`manage-perm-${perm.id}`}
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              {perm.name}
                              <Badge variant="outline" className="text-xs">{perm.action}</Badge>
                            </Label>
                            {perm.description && (
                              <p className="text-xs text-muted-foreground mt-1">{perm.description}</p>
                            )}
                            {perm.documentTypeId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Spécifique au type de document
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSavePermissions} disabled={processing}>
              {processing ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardShell>
    </PermissionGuard>
  )
}
