'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLocale()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.nav.configuration}</h1>
        <p className="text-muted-foreground">
          Configurez les paramètres de votre plateforme
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Types de bons</CardTitle>
            <CardDescription>
              Gérez les types de bons disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Gérer les types de bons
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
            <CardDescription>
              Gérez les utilisateurs et leurs permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Gérer les utilisateurs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres généraux</CardTitle>
            <CardDescription>
              Configuration générale de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Ouvrir les paramètres
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intégrations</CardTitle>
            <CardDescription>
              Configurez les intégrations externes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Gérer les intégrations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



