"use client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/contexts/locale-context"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { api, type Notification as NotificationType } from "@/lib/api"

export function NotificationsNav() {
  const { t } = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await api.getNotifications({ limit: 5, unread: 'true' })
      setNotifications(response.data)
      
      const countResponse = await api.getUnreadNotificationsCount()
      setUnreadCount(countResponse.count)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user, loadNotifications])

  // Écouter les événements WebSocket pour recharger les notifications en temps réel
  useEffect(() => {
    if (!user) return

    const handleNotificationEvent = () => {
      loadNotifications()
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
  }, [user, loadNotifications])

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ))
      loadNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      loadNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
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
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="font-semibold flex items-center justify-between">
          <span>{t.common.notifications}</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t.common.noNotifications || 'Aucune notification'}
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.link) {
                    router.push(notification.link)
                  }
                }}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <p className={`text-sm font-medium leading-none ${!notification.isRead ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.description}</p>
                  </div>
                  {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
                </div>
                <div className="flex items-center justify-between w-full mt-1">
                  <span className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</span>
                  <Badge variant="outline" className="text-xs">
                    {notification.type === 'document' && 'Document'}
                    {notification.type === 'document_type' && 'Type'}
                    {notification.type === 'category' && 'Catégorie'}
                    {notification.type === 'user' && 'Utilisateur'}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 px-2 py-2">
              {unreadCount > 0 && (
                <DropdownMenuItem 
                  className="text-center justify-center text-sm text-primary cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    markAllAsRead()
                  }}
                >
                  Marquer tout comme lu
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-center justify-center text-sm text-muted-foreground cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push('/dashboard/notifications')
                }}
              >
                Voir toutes les notifications
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
