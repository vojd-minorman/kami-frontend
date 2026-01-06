"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Ticket, Users, Settings, FileText, ChevronRight, LogOut, Layers, FileSignature } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { useLocale } from "@/contexts/locale-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleToggle } from "@/components/locale-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useLocale()

  const navItems = [
    {
      title: t.nav.dashboard,
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t.nav.bons,
      href: "/dashboard/vouchers",
      icon: Ticket,
    },
    {
      title: "Types de bons",
      href: "/dashboard/bon-types",
      icon: Layers,
    },
    {
      title: t.nav.templates,
      href: "/dashboard/templates",
      icon: FileText,
    },
    {
      title: "Mes signatures",
      href: "/dashboard/signatures",
      icon: FileSignature,
    },
    {
      title: t.nav.users,
      href: "/dashboard/users",
      icon: Users,
    },
  ]

  // Fonction pour vérifier si une route est active (y compris les sous-routes)
  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                <span className="font-bold text-lg">K</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Kami Operation</span>
                <span className="truncate text-xs text-muted-foreground">Bons Numériques</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {isActive && <ChevronRight className="ml-auto size-4" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute("/dashboard/settings")} tooltip={t.nav.configuration}>
                  <Link href="/dashboard/settings" className="flex items-center gap-3">
                    <Settings className="size-4" />
                    <span>{t.nav.configuration}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2">
                <ThemeToggle />
                <LocaleToggle />
              </div>
              <Separator orientation="vertical" className="h-6 group-data-[collapsible=icon]:hidden" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                title={t.nav.logout}
              >
                <LogOut className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">{t.nav.logout}</span>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
