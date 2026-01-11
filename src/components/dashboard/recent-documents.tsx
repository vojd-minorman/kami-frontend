"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Ticket } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface RecentDocument {
  id: string
  documentNumber: string
  documentTypeName: string
  status: string
  createdAt: string
  createdByName: string
}

interface RecentDocumentsProps {
  documents: RecentDocument[]
  loading?: boolean
  maxItems?: number
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    DRAFT: { label: "Brouillon", variant: "outline" },
    SUBMITTED: { label: "Soumis", variant: "secondary" },
    IN_PROGRESS: { label: "En cours", variant: "secondary" },
    VALIDATED: { label: "Validé", variant: "default" },
    SIGNED: { label: "Signé", variant: "default" },
    ACTIVE: { label: "Actif", variant: "default" },
    CANCELLED: { label: "Annulé", variant: "destructive" },
    EXPIRED: { label: "Expiré", variant: "destructive" },
    USED: { label: "Utilisé", variant: "default" },
  }
  const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
}

export function RecentDocuments({
  documents,
  loading = false,
  maxItems = 4,
}: RecentDocumentsProps) {
  const router = useRouter()

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Documents Récents</CardTitle>
          <CardDescription className="text-sm">
            Les derniers documents créés sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
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
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Documents Récents</CardTitle>
          <CardDescription className="text-sm">
            Les derniers documents créés sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Ticket className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-sm">Aucun document pour le moment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Documents Récents</CardTitle>
        <CardDescription className="text-sm">
          Les derniers documents créés sur la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {documents.slice(0, maxItems).map((document) => (
            <div
              key={document.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer",
                "group active:scale-[0.98]"
              )}
              onClick={() => router.push(`/dashboard/vouchers/${document.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/dashboard/vouchers/${document.id}`)
                }
              }}
            >
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 sm:mt-0 group-hover:scale-125 transition-transform" />
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                  {document.documentNumber || `Document #${document.id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {document.documentTypeName} • {document.createdByName}
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
      </CardContent>
    </Card>
  )
}
