'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  CheckCheck,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { api, type Notification } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { useToast } from '@/hooks/use-toast'

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'document' | 'document_type' | 'category' | 'user'>('all')
  const limit = 20

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {
        page: currentPage,
        limit,
      }
      
      if (filter === 'unread') {
        params.unread = 'true'
      } else if (filter === 'read') {
        params.unread = 'false'
      }
      
      if (typeFilter !== 'all') {
        params.type = typeFilter
      }

      const response = await api.getNotifications(params)
      setNotifications(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.lastPage)
    } catch (error: any) {
      console.error('Error loading notifications:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les notifications',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentPage, filter, typeFilter, toast])

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.getUnreadNotificationsCount()
      setUnreadCount(response.count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [user, loadNotifications, loadUnreadCount])

  // Écouter les événements WebSocket pour mettre à jour les notifications en temps réel
  useEffect(() => {
    if (!user) return

    const handleNotificationEvent = () => {
      // Recharger les notifications et le compteur
      loadNotifications()
      loadUnreadCount()
    }

    // Écouter tous les événements qui créent des notifications
    const events = [
      'document:created',
      'document:signed',
      'document:status_changed',
      'document:updated',
      'document:approved',
      'document:rejected',
      'document_type:created',
      'document_type:updated',
      'document_type:deleted',
      'category:created',
      'category:updated',
      'category:deleted',
      'user:created',
      'user:updated',
    ]

    events.forEach((event) => {
      window.addEventListener(event, handleNotificationEvent)
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleNotificationEvent)
      })
    }
  }, [user, loadNotifications, loadUnreadCount])

  const handleMarkAsRead = async (id: string) => {
    try {
      setMarkingAsRead(id)
      await api.markNotificationAsRead(id)
      
      // Mettre à jour localement
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ))
      
      // Recharger le compteur
      loadUnreadCount()
      
      toast({
        title: 'Succès',
        description: 'Notification marquée comme lue',
      })
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de marquer la notification comme lue',
        variant: 'destructive',
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setProcessing(true)
      await api.markAllNotificationsAsRead()
      
      // Mettre à jour localement
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      
      // Recharger le compteur et les notifications
      loadUnreadCount()
      loadNotifications()
      
      toast({
        title: 'Succès',
        description: 'Toutes les notifications ont été marquées comme lues',
      })
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de marquer toutes les notifications comme lues',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id)
      await api.deleteNotification(id)
      
      // Retirer de la liste localement
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
      
      // Recharger le compteur
      loadUnreadCount()
      
      toast({
        title: 'Succès',
        description: 'Notification supprimée',
      })
    } catch (error: any) {
      console.error('Error deleting notification:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la notification',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAllRead = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications lues ? Cette action est irréversible.')) {
      return
    }

    try {
      setProcessing(true)
      await api.deleteReadNotifications()
      
      // Recharger les notifications et le compteur
      loadNotifications()
      loadUnreadCount()
      
      toast({
        title: 'Succès',
        description: 'Toutes les notifications lues ont été supprimées',
      })
    } catch (error: any) {
      console.error('Error deleting read notifications:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer les notifications lues',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marquer comme lue si ce n'est pas déjà fait
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }

    // Naviguer vers le lien si disponible
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days} jour(s)`
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return '📄'
      case 'document_type':
        return '📋'
      case 'category':
        return '🏷️'
      case 'user':
        return '👤'
      default:
        return '🔔'
    }
  }

  const filteredNotifications = notifications

  return (
    <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez vos notifications et restez informé des dernières activités
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={processing}
                className="w-full sm:w-auto"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Tout marquer comme lu
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDeleteAllRead}
              disabled={processing || notifications.filter(n => n.isRead).length === 0}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer les lues
            </Button>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={filter} onValueChange={(value: any) => {
                  setFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes ({total})</SelectItem>
                    <SelectItem value="unread">Non lues ({unreadCount})</SelectItem>
                    <SelectItem value="read">Lues ({total - unreadCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={(value: any) => {
                  setTypeFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="document_type">Types de documents</SelectItem>
                    <SelectItem value="category">Catégories</SelectItem>
                    <SelectItem value="user">Utilisateurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilter('all')
                    setTypeFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground mt-1">Notifications au total</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Non lues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{unreadCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Nécessitent votre attention</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total - unreadCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Déjà consultées</p>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Liste des notifications</CardTitle>
            <CardDescription className="text-sm">
              {total > 0 ? `${total} notification(s) trouvée(s)` : 'Aucune notification'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {filter !== 'all' || typeFilter !== 'all'
                    ? 'Aucune notification ne correspond à vos critères de filtrage'
                    : 'Aucune notification pour le moment'}
                </p>
                {(filter !== 'all' || typeFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter('all')
                      setTypeFilter('all')
                      setCurrentPage(1)
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                        notification.isRead
                          ? 'bg-muted/30 border-border/50'
                          : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${
                          notification.isRead ? 'bg-muted' : 'bg-primary/20'
                        }`}>
                          {getTypeIcon(notification.type)}
                        </div>
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-sm font-semibold leading-none ${
                                !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${
                              notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notification.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(notification.createdAt)}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {notification.type === 'document' && 'Document'}
                                {notification.type === 'document_type' && 'Type de document'}
                                {notification.type === 'category' && 'Catégorie'}
                                {notification.type === 'user' && 'Utilisateur'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!notification.isRead ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingAsRead === notification.id}
                            title="Marquer comme lu"
                          >
                            {markingAsRead === notification.id ? (
                              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingAsRead === notification.id}
                            title="Marquer comme non lu"
                          >
                            {markingAsRead === notification.id ? (
                              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {notification.link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(notification.link!)}
                            title="Ouvrir"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleting === notification.id}
                          title="Supprimer"
                        >
                          {deleting === notification.id ? (
                            <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages} • {total} notification(s) au total
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
    </DashboardShell>
  )
}
