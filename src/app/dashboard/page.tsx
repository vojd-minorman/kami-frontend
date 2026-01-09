"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/contexts/locale-context"
import { Ticket, TrendingUp, DollarSign, Activity } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { useAuth } from "@/hooks/use-auth"
import { api, type Document } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const { t } = useLocale()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true)
        const response = await api.getDocuments({ page: 1, limit: 100 })
        setDocuments(response.data)
        
        // Calculer les statistiques
        const statsData = {
          total: response.meta.total,
          pending: response.data.filter(d => d.status === 'DRAFT' || d.status === 'SUBMITTED').length,
          approved: response.data.filter(d => d.status === 'VALIDATED' || d.status === 'SIGNED' || d.status === 'ACTIVE').length,
          rejected: response.data.filter(d => d.status === 'CANCELLED').length,
        }
        setStats(statsData)
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadDocuments()
    }
  }, [user])

  const statsCards = [
    {
      title: "Total des Documents",
      value: stats.total.toLocaleString(),
      change: "",
      icon: Ticket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "En Attente",
      value: stats.pending.toLocaleString(),
      change: "",
      icon: Activity,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Approuvés",
      value: stats.approved.toLocaleString(),
      change: "",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Rejetés",
      value: stats.rejected.toLocaleString(),
      change: "",
      icon: DollarSign,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Brouillon", variant: "outline" },
      pending: { label: "En attente", variant: "secondary" },
      signed: { label: "Signé", variant: "default" },
      approved: { label: "Approuvé", variant: "default" },
      rejected: { label: "Rejeté", variant: "destructive" },
    }
    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <DashboardShell>
      <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">Vue d'ensemble de votre plateforme de documents numériques</p>
      </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
          <Card
            key={index}
                className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-border/50"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                  {stat.change && (
              <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                <p className="text-xs text-green-500 font-medium">{stat.change}</p>
              </div>
                  )}
            </CardContent>
          </Card>
        ))}
      </div>
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4 border-border/50">
          <CardHeader>
              <CardTitle className="text-lg md:text-xl">Documents Récents</CardTitle>
              <CardDescription className="text-sm">Les derniers documents créés sur la plateforme</CardDescription>
          </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Ticket className="h-12 w-12 mx-auto opacity-50" />
                    <p className="text-sm">Aucun document pour le moment</p>
            </div>
            </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {documents.slice(0, 10).map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 sm:mt-0" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                          {document.documentNumber || `Document #${document.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {document.documentType?.name || "Type inconnu"} • {document.siteName || "Site non spécifié"}
                        </p>
                        {document.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(document.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
            </div>
                      <div className="flex-shrink-0">{getStatusBadge(document.status)}</div>
            </div>
                  ))}
            </div>
              )}
          </CardContent>
        </Card>

          <Card className="col-span-full lg:col-span-3 border-border/50">
          <CardHeader>
              <CardTitle className="text-lg md:text-xl">Résumé</CardTitle>
              <CardDescription className="text-sm">Statistiques globales de votre activité</CardDescription>
          </CardHeader>
          <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
            <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Total</span>
                    </div>
                    <span className="text-lg font-bold">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">En attente</span>
                    </div>
                    <span className="text-lg font-bold">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Approuvés</span>
                    </div>
                    <span className="text-lg font-bold">{stats.approved}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">Rejetés</span>
                    </div>
                    <span className="text-lg font-bold">{stats.rejected}</span>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardShell>
  )
}
