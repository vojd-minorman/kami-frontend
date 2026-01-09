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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Calendar, 
  Plus, 
  Edit, 
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Key,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { api, type User } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

interface Role {
  id: string
  name: string
  code: string
  description?: string
  isSystem?: boolean
  isActive?: boolean
  permissions?: any[]
}

export default function UsersPage() {
  const { t } = useLocale()
  const { user: currentUser, loading: authLoading } = useAuth()
  const { hasPermission } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [limit] = useState(10)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    roleIds: [] as string[],
  })
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  useEffect(() => {
    if (currentUser) {
      loadUsers()
      loadRoles()
    }
  }, [currentUser, currentPage, roleFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: currentPage,
        limit,
      }
      
      if (searchQuery) {
        params.search = searchQuery
      }
      
      if (roleFilter !== 'all') {
        params.role = roleFilter
      }

      const response = await api.getUsers(params)
      setUsers(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.lastPage)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      setLoadingRoles(true)
      const rolesData = await api.getRoles()
      setRoles(rolesData)
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadUsers()
  }

  const handleToggleActive = async (user: User) => {
    if (!confirm(`Êtes-vous sûr de vouloir ${user.isActive ? 'désactiver' : 'activer'} cet utilisateur ?`)) {
      return
    }

    try {
      setProcessing(true)
      if (user.isActive) {
        await api.deactivateUser(user.id)
      } else {
        await api.activateUser(user.id)
      }
      await loadUsers()
    } catch (error: any) {
      console.error('Error toggling user status:', error)
      alert(error.message || 'Erreur lors de la modification')
    } finally {
      setProcessing(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName || '',
      role: user.role,
      roleIds: user.roles?.map(r => r.id) || [],
    })
    setSelectedRoleIds(user.roles?.map(r => r.id) || [])
    setIsEditDialogOpen(true)
  }

  const handleCreate = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: 'user',
      roleIds: [],
    })
    setSelectedRoleIds([])
    setIsCreateDialogOpen(true)
  }

  const handleSaveUser = async () => {
    try {
      setProcessing(true)
      
      if (editingUser) {
        // Mise à jour
        const updateData: any = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          isActive: editingUser.isActive,
        }
        
        // Ajouter le mot de passe seulement s'il est fourni
        if (formData.password) {
          updateData.password = formData.password
        }
        
        await api.updateUser(editingUser.id, updateData)
        
        // Assigner les rôles
        if (selectedRoleIds.length > 0) {
          await api.assignUserRoles(editingUser.id, selectedRoleIds)
        } else {
          // Si aucun rôle sélectionné, retirer tous les rôles
          const currentRoleIds = editingUser.roles?.map(r => r.id) || []
          for (const roleId of currentRoleIds) {
            await api.detachUserRole(editingUser.id, roleId)
          }
        }
      } else {
        // Création
        await api.createUser({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          roleIds: selectedRoleIds,
        })
      }
      
      setIsEditDialogOpen(false)
      setIsCreateDialogOpen(false)
      await loadUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      alert(error.message || 'Erreur lors de la sauvegarde')
    } finally {
      setProcessing(false)
    }
  }

  const handleManageRoles = (user: User) => {
    setEditingUser(user)
    setSelectedRoleIds(user.roles?.map(r => r.id) || [])
    setIsRolesDialogOpen(true)
  }

  const handleSaveRoles = async () => {
    if (!editingUser) return
    
    try {
      setProcessing(true)
      await api.assignUserRoles(editingUser.id, selectedRoleIds)
      setIsRolesDialogOpen(false)
      await loadUsers()
    } catch (error: any) {
      console.error('Error saving roles:', error)
      alert(error.message || 'Erreur lors de la sauvegarde')
    } finally {
      setProcessing(false)
    }
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      admin: { label: "Administrateur", variant: "destructive" },
      manager: { label: "Gestionnaire", variant: "default" },
      user: { label: "Utilisateur", variant: "secondary" },
      viewer: { label: "Visualiseur", variant: "outline" },
    }
    const roleInfo = roleMap[role] || { label: role, variant: "outline" as const }
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
  }

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.nav.users}</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les utilisateurs et leurs permissions
            </p>
          </div>
          {hasPermission('user.create') && (
            <Button className="w-full sm:w-auto" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          )}
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
                    placeholder="Rechercher un utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rôle</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="manager">Gestionnaire</SelectItem>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="viewer">Visualiseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery('')
                    setRoleFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  Réinitialiser
                </Button>
                <Button
                  onClick={handleSearch}
                  className="w-full"
                >
                  Rechercher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Utilisateurs</CardTitle>
            <CardDescription className="text-sm">
              {total > 0 ? `${total} utilisateur(s) trouvé(s)` : 'Aucun utilisateur'}
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
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || roleFilter !== 'all'
                    ? 'Aucun utilisateur ne correspond à vos critères de recherche'
                    : 'Aucun utilisateur trouvé'}
                </p>
                {(searchQuery || roleFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setRoleFilter('all')
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
                        <TableHead className="min-w-[200px]">Utilisateur</TableHead>
                        <TableHead className="min-w-[150px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Rôle</TableHead>
                        <TableHead className="min-w-[150px]">Rôles assignés</TableHead>
                        <TableHead className="min-w-[100px]">Statut</TableHead>
                        <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{user.fullName || 'Sans nom'}</div>
                                {user.roles && user.roles.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {user.roles.length} rôle(s) assigné(s)
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            {user.roles && user.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.roles.slice(0, 2).map((role: any) => (
                                  <Badge key={role.id} variant="outline" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))}
                                {user.roles.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{user.roles.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Aucun</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.isActive ? (
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
                              {hasPermission('user.update') && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(user)}
                                    disabled={processing}
                                    title="Modifier"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleManageRoles(user)}
                                    disabled={processing}
                                    title="Gérer les rôles"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleActive(user)}
                                    disabled={processing || user.id === currentUser?.id}
                                    className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                                    title={user.isActive ? 'Désactiver' : 'Activer'}
                                  >
                                    {user.isActive ? (
                                      <XCircle className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              )}
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
                      Page {currentPage} sur {totalPages} • {total} utilisateur(s) au total
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open)
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingUser(null)
          setFormData({
            email: '',
            password: '',
            fullName: '',
            role: 'user',
            roleIds: [],
          })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Remplissez les informations pour créer un nouvel utilisateur'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.dupont@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle par défaut</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="manager">Gestionnaire</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="viewer">Visualiseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rôles assignés</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                {loadingRoles ? (
                  <div className="text-sm text-muted-foreground">Chargement des rôles...</div>
                ) : roles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun rôle disponible</div>
                ) : (
                  <div className="space-y-2">
                    {roles.filter(r => r.isActive !== false).map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div className="flex items-center justify-between">
                            <span>{role.name}</span>
                            {role.isSystem && (
                              <Badge variant="outline" className="text-xs ml-2">Système</Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                          )}
                        </Label>
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
            <Button onClick={handleSaveUser} disabled={processing || !formData.email || (!editingUser && !formData.password)}>
              {processing ? 'Enregistrement...' : editingUser ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les rôles de {editingUser?.fullName || editingUser?.email}</DialogTitle>
            <DialogDescription>
              Sélectionnez les rôles à assigner à cet utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingRoles ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Chargement des rôles...</div>
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Aucun rôle disponible</div>
              </div>
            ) : (
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-2">
                {roles.filter(r => r.isActive !== false).map((role) => (
                  <div key={role.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50">
                    <Checkbox
                      id={`manage-role-${role.id}`}
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`manage-role-${role.id}`}
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        {role.name}
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs">Système</Badge>
                        )}
                      </Label>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                      )}
                      {role.permissions && role.permissions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {role.permissions.slice(0, 5).map((perm: any) => (
                            <Badge key={perm.id} variant="secondary" className="text-xs">
                              {perm.name}
                            </Badge>
                          ))}
                          {role.permissions.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{role.permissions.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRolesDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveRoles} disabled={processing}>
              {processing ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
