'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { api, type User } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function UsersPage() {
  const { t } = useLocale()
  const { user: currentUser, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [limit] = useState(10)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (currentUser) {
      loadUsers()
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
    setIsEditDialogOpen(true)
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
          <Button className="w-full sm:w-auto" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un utilisateur
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
                        <TableHead className="min-w-[100px]">Statut</TableHead>
                        <TableHead className="text-right min-w-[150px]">Actions</TableHead>
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
                                <div className="font-medium">{user.fullName}</div>
                                {user.roles && user.roles.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {user.roles.length} rôle(s)
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                                disabled={processing}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Modifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(user)}
                                disabled={processing || user.id === currentUser?.id}
                                className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                              >
                                {user.isActive ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Désactiver
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Activer
                                  </>
                                )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur. Les modifications seront sauvegardées immédiatement.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                La modification des utilisateurs sera disponible prochainement.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Nom complet: {editingUser.fullName}</p>
                <p className="text-sm font-medium">Email: {editingUser.email}</p>
                <p className="text-sm font-medium">Rôle: {editingUser.role}</p>
                <p className="text-sm font-medium">
                  Statut: {editingUser.isActive ? 'Actif' : 'Inactif'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
