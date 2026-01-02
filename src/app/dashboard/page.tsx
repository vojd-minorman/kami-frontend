"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/contexts/locale-context"
import { Ticket, Users, TrendingUp, DollarSign, Activity } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"

export default function DashboardPage() {
  const { t } = useLocale()

  const stats = [
    {
      title: "Bons Actifs",
      value: "1,234",
      change: "+12.5%",
      icon: Ticket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Utilisateurs",
      value: "567",
      change: "+8.2%",
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Revenus",
      value: "45,678 €",
      change: "+23.1%",
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Transactions",
      value: "8,901",
      change: "+15.3%",
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ]

  return (
    <DashboardShell>
      <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-2">Vue d'ensemble de votre plateforme de bons numériques</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 border-border/50"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-xs text-green-500 font-medium">{stat.change}</p>
                <span className="text-xs text-muted-foreground">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Aperçu des Activités</CardTitle>
            <CardDescription>Statistiques de vos bons numériques ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Graphique des activités (à implémenter)
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Aperçu des Activités</CardTitle>
            <CardDescription>Statistiques de vos bons numériques ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Graphique des activités (à implémenter)
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Aperçu des Activités</CardTitle>
            <CardDescription>Statistiques de vos bons numériques ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Graphique des activités (à implémenter)
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Aperçu des Activités</CardTitle>
            <CardDescription>Statistiques de vos bons numériques ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Graphique des activités (à implémenter)
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Aperçu des Activités</CardTitle>
            <CardDescription>Statistiques de vos bons numériques ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Graphique des activités (à implémenter)
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/50">
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Les dernières transactions de votre plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Transaction #{item}234</p>
                    <p className="text-sm text-muted-foreground">Il y a {item} minutes</p>
                  </div>
                  <div className="font-medium text-sm">+{item * 100} €</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardShell>
  )
}
