"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivitySummaryProps {
  today: number
  thisWeek: number
  thisMonth: number
}

export function ActivitySummary({ today, thisWeek, thisMonth }: ActivitySummaryProps) {
  const activities = [
    {
      label: "Aujourd'hui",
      value: today,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Cette semaine",
      value: thisWeek,
      icon: Calendar,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Ce mois",
      value: thisMonth,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ]

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Activité Récente</CardTitle>
        <CardDescription className="text-sm">
          Documents créés sur différentes périodes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  activity.bgColor,
                  "border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", activity.bgColor)}>
                    <Icon className={cn("h-5 w-5", activity.color)} />
                  </div>
                  <span className="text-sm font-medium">{activity.label}</span>
                </div>
                <span className="text-lg font-bold">{activity.value}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
