"use client"

import { useEffect, useState, useCallback } from "react"
import { useLocale } from "@/contexts/locale-context"
import {
  Ticket,
  TrendingUp,
  DollarSign,
  Activity,
  FileCheck,
  FileX,
  Clock,
} from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { useAuth } from "@/hooks/use-auth"
import { api, type DashboardStats } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProfessionalChart } from "@/components/dashboard/professional-chart"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { PendingActions } from "@/components/dashboard/pending-actions"
import { ActivitySummary } from "@/components/dashboard/activity-summary"
import { PermissionGuard } from "@/components/permission-guard"
import { useRouter } from "next/navigation"

// Helper pour formater les labels de statut
const formatStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    DRAFT: "Brouillon",
    SUBMITTED: "Soumis",
    IN_PROGRESS: "En cours",
    VALIDATED: "Validé",
    SIGNED: "Signé",
    ACTIVE: "Actif",
    EXPIRED: "Expiré",
    CANCELLED: "Annulé",
    USED: "Utilisé",
  }
  return statusMap[status] || status
}

export default function DashboardPage() {
  const { t } = useLocale()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardStats = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const dashboardStats = await api.getDashboardStats()
      setStats(dashboardStats)
    } catch (err: any) {
      console.error("Erreur lors du chargement des statistiques du dashboard:", err)
      setError(err.message || "Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadDashboardStats()
    }
  }, [user, loadDashboardStats])

  // Écouter les événements WebSocket pour mettre à jour le dashboard en temps réel
  useEffect(() => {
    if (!user) return

    const handleDashboardUpdate = () => {
      console.log("📊 [Dashboard] Mise à jour du dashboard")
      loadDashboardStats()
    }

    const handleDocumentCreated = () => handleDashboardUpdate()
    const handleDocumentSigned = () => handleDashboardUpdate()
    const handleDocumentStatusChanged = () => handleDashboardUpdate()
    const handleDocumentUpdated = () => handleDashboardUpdate()

    window.addEventListener("document:created", handleDocumentCreated as EventListener)
    window.addEventListener("document:signed", handleDocumentSigned as EventListener)
    window.addEventListener(
      "document:status_changed",
      handleDocumentStatusChanged as EventListener
    )
    window.addEventListener("document:updated", handleDocumentUpdated as EventListener)
    window.addEventListener("dashboard:update", handleDashboardUpdate as EventListener)

    return () => {
      window.removeEventListener("document:created", handleDocumentCreated as EventListener)
      window.removeEventListener("document:signed", handleDocumentSigned as EventListener)
      window.removeEventListener(
        "document:status_changed",
        handleDocumentStatusChanged as EventListener
      )
      window.removeEventListener("document:updated", handleDocumentUpdated as EventListener)
      window.removeEventListener("dashboard:update", handleDashboardUpdate as EventListener)
    }
  }, [user, loadDashboardStats])

  const statsCards = stats
    ? [
        {
          title: "Total des Documents",
          value: stats.documents.total.toLocaleString(),
          icon: Ticket,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          onClick: () => router.push("/dashboard/vouchers"),
        },
        {
          title: "En Attente",
          value: stats.documents.pending.toLocaleString(),
          icon: Activity,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          onClick: () =>
            router.push("/dashboard/vouchers?status=SUBMITTED,IN_PROGRESS"),
        },
        {
          title: "Approuvés",
          value: stats.documents.approved.toLocaleString(),
          icon: TrendingUp,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          onClick: () =>
            router.push("/dashboard/vouchers?status=VALIDATED,SIGNED,ACTIVE"),
        },
        {
          title: "Rejetés",
          value: stats.documents.rejected.toLocaleString(),
          icon: DollarSign,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          onClick: () => router.push("/dashboard/vouchers?status=CANCELLED"),
        },
        {
          title: "Signés",
          value: stats.documents.signed.toLocaleString(),
          icon: FileCheck,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          onClick: () => router.push("/dashboard/vouchers?status=SIGNED"),
        },
        {
          title: "Brouillons",
          value: stats.documents.draft.toLocaleString(),
          icon: FileX,
          color: "text-gray-500",
          bgColor: "bg-gray-500/10",
          onClick: () => router.push("/dashboard/vouchers?status=DRAFT"),
        },
      ]
    : []

  return (
    <PermissionGuard permission="document.read">
      <DashboardShell>
        <div className="space-y-6 md:space-y-8 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t.dashboard.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Vue d'ensemble de votre plateforme de documents numériques
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <p className="text-sm font-medium">Erreur: {error}</p>
            </div>
          )}

          {/* Cartes de statistiques principales */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {statsCards.map((stat, index) => (
                <StatsCard key={index} {...stat} />
              ))}
            </div>
          )}

          {/* Actions en attente */}
          {stats && stats.pendingActions && (
            <PermissionGuard permission="document.read">
              <PendingActions
                awaitingSignature={stats.pendingActions.awaitingSignature}
                awaitingApproval={stats.pendingActions.awaitingApproval}
                awaitingReview={stats.pendingActions.awaitingReview}
              />
            </PermissionGuard>
          )}

          {/* Grille principale avec graphiques et documents récents */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Documents récents */}
            <div className="col-span-full lg:col-span-4">
              {loading ? (
                <div className="border rounded-lg p-6 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <RecentDocuments
                  documents={stats?.recentDocuments || []}
                  loading={loading}
                />
              )}
            </div>

            {/* Activité récente */}
            <div className="col-span-full lg:col-span-3">
              {loading ? (
                <div className="border rounded-lg p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                stats && (
                  <ActivitySummary
                    today={stats.activity.today}
                    thisWeek={stats.activity.thisWeek}
                    thisMonth={stats.activity.thisMonth}
                  />
                )
              )}
            </div>
          </div>

          {/* Graphiques */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Graphique par type de document */}
              {stats.documentsByType && stats.documentsByType.length > 0 && (
                <PermissionGuard permission="document.read">
                  <ProfessionalChart
                    title="Documents par Type"
                    description="Répartition des documents selon leur type"
                    data={stats.documentsByType.map((dt) => ({
                      label: dt.documentTypeName,
                      value: dt.count,
                    }))}
                    type="bar"
                  />
                </PermissionGuard>
              )}

              {/* Graphique par statut */}
              {stats.documentsByStatus && stats.documentsByStatus.length > 0 && (
                <PermissionGuard permission="document.read">
                  <ProfessionalChart
                    title="Documents par Statut"
                    description="Répartition des documents selon leur statut"
                    data={stats.documentsByStatus.map((ds) => ({
                      label: formatStatusLabel(ds.status),
                      value: ds.count,
                    }))}
                    type="bar"
                  />
                </PermissionGuard>
              )}
            </div>
          )}
        </div>
      </DashboardShell>
    </PermissionGuard>
  )
}
