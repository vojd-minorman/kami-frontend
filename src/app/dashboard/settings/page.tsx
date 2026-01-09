'use client'

import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Settings as SettingsIcon, Users, FileText, Globe, Shield, Ticket, Database } from 'lucide-react'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'

export default function SettingsPage() {
  const { t } = useLocale()
  const { user } = useAuth()

  const settingsCards = [
    {
      title: 'Templates PDF',
      description: 'Gérez les templates PDF pour vos types de documents',
      icon: FileText,
      href: '/dashboard/templates',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Utilisateurs',
      description: 'Gérez les utilisateurs et leurs permissions',
      icon: Users,
      href: '/dashboard/users',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Types de documents',
      description: 'Gérez les types de documents disponibles',
      icon: Ticket,
      href: '/dashboard/document-types',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Rôles et Permissions',
      description: 'Configurez les rôles et permissions du système',
      icon: Shield,
      href: '#',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      disabled: true,
    },
    {
      title: 'Paramètres généraux',
      description: 'Configuration générale de la plateforme',
      icon: SettingsIcon,
      href: '#',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      disabled: true,
    },
    {
      title: 'Base de données',
      description: 'Gérez les sauvegardes et la maintenance',
      icon: Database,
      href: '#',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      disabled: true,
    },
  ]

  return (
    <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.nav.configuration}</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Configurez les paramètres de votre plateforme
          </p>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((setting, index) => {
            const Icon = setting.icon
            const CardComponent = setting.disabled ? Card : Link
            
            const cardContent = (
              <Card className={`border-border/50 transition-all duration-300 hover:shadow-lg ${
                setting.disabled ? 'opacity-60' : 'hover:scale-[1.02] cursor-pointer'
              }`}>
                <CardHeader>
                  <div className={`${setting.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`h-6 w-6 ${setting.color}`} />
                  </div>
                  <CardTitle className="text-lg md:text-xl">{setting.title}</CardTitle>
                  <CardDescription className="text-sm">{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={setting.disabled}
                  >
                    {setting.disabled ? 'Bientôt disponible' : 'Ouvrir'}
                  </Button>
                </CardContent>
              </Card>
            )

            if (setting.disabled) {
              return <div key={index}>{cardContent}</div>
            }

            return (
              <CardComponent key={index} href={setting.href}>
                {cardContent}
              </CardComponent>
            )
          })}
        </div>

        {/* Info Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p className="text-muted-foreground">
                Certaines fonctionnalités de configuration sont en cours de développement.
                Les sections disponibles sont accessibles via les cartes ci-dessus.
              </p>
              {user && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-muted-foreground">
                    Connecté en tant que : <span className="font-medium text-foreground">{user.fullName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Rôle : <span className="font-medium text-foreground">{user.role}</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}



