"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileCheck, FileX, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface PendingActionsProps {
  awaitingSignature: number
  awaitingApproval: number
  awaitingReview: number
}

export function PendingActions({
  awaitingSignature,
  awaitingApproval,
  awaitingReview,
}: PendingActionsProps) {
  const router = useRouter()
  const total = awaitingSignature + awaitingApproval + awaitingReview

  const actions = [
    {
      label: "En attente de signature",
      count: awaitingSignature,
      icon: FileCheck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      onClick: () => router.push("/dashboard/vouchers?status=SUBMITTED,IN_PROGRESS"),
    },
    {
      label: "En attente d'approbation",
      count: awaitingApproval,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      onClick: () => router.push("/dashboard/vouchers?status=SUBMITTED"),
    },
    {
      label: "En attente de révision",
      count: awaitingReview,
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      onClick: () => router.push("/dashboard/vouchers?status=IN_PROGRESS"),
    },
  ]

  if (total === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Actions en Attente</CardTitle>
          <CardDescription className="text-sm">
            Documents nécessitant votre attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <FileCheck className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-sm">Aucune action en attente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Actions en Attente</CardTitle>
        <CardDescription className="text-sm">
          Documents nécessitant votre attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            if (action.count === 0) return null

            const Icon = action.icon
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02]",
                  action.bgColor,
                  action.borderColor
                )}
                onClick={action.onClick}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", action.bgColor)}>
                    <Icon className={cn("h-5 w-5", action.color)} />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {action.count}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
