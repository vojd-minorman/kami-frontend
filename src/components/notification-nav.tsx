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

export function NotificationsNav() {
  const { t } = useLocale()

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: "Nouveau document généré",
      description: "Le document #1234 a été créé avec succès",
      time: "Il y a 5 min",
      unread: true,
    },
    {
      id: 2,
      title: "Utilisateur ajouté",
      description: "Jean Dupont a rejoint la plateforme",
      time: "Il y a 1 heure",
      unread: true,
    },
    {
      id: 3,
      title: "Mise à jour système",
      description: "Une nouvelle version est disponible",
      time: "Il y a 3 heures",
      unread: false,
    },
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

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
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-semibold">{t.common.notifications}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t.common.noNotifications}
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.description}</p>
                  </div>
                  {notification.unread && <div className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
                </div>
                <span className="text-xs text-muted-foreground">{notification.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-sm text-primary cursor-pointer">
              {t.common.viewAll}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
