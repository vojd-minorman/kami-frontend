"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface ProfessionalChartProps {
  title: string
  description?: string
  data: ChartDataPoint[]
  type?: "bar" | "pie" | "histogram"
  className?: string
}

// Couleurs professionnelles pour les graphiques (avec support thème clair/sombre)
const DEFAULT_COLORS = [
  "#3b82f6", // blue-500 - Professionnel et fiable
  "#10b981", // green-500 - Succès/positif
  "#f59e0b", // yellow-500 - Attention/en attente
  "#8b5cf6", // purple-500 - Créatif
  "#ef4444", // red-500 - Urgent/rejeté
  "#06b6d4", // cyan-500 - Informatif
  "#f97316", // orange-500 - Avertissement
  "#6366f1", // indigo-500 - Professionnel
  "#14b8a6", // teal-500 - Neutre
  "#ec4899", // pink-500 - Accent
]

// Formater les labels pour les statuts
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

// Tooltip personnalisé avec style professionnel
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 min-w-[150px]">
        <p className="font-semibold text-sm mb-2 text-foreground">{data.payload.fullName || label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Valeur:</span>
            <span className="text-sm font-bold" style={{ color: data.color }}>
              {data.value.toLocaleString()}
            </span>
          </div>
          {payload.length > 1 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-sm font-medium">{total.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Pourcentage:</span>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function ProfessionalChart({
  title,
  description,
  data,
  type = "bar",
  className,
}: ProfessionalChartProps) {
  // Préparer les données pour Recharts avec labels optimisés
  const chartData = data.map((point, index) => {
    // Formater le label pour l'affichage sur l'axe X (tronquer si trop long pour affichage horizontal)
    // Pour les labels horizontaux, on peut permettre un peu plus de caractères
    const maxLength = 15
    const displayName = point.label.length > maxLength 
      ? `${point.label.substring(0, maxLength - 3)}...` 
      : point.label
    
    return {
      name: displayName,
      fullName: point.label, // Nom complet pour tooltip et légende
      value: point.value,
      fill: point.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }
  })

  if (type === "pie") {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => 
                  percent > 0.05 
                    ? `${(percent * 100).toFixed(0)}%` 
                    : ""
                }
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                fill="#8884d8"
                dataKey="value"
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }} className="text-sm text-foreground">
                    {entry.payload.fullName}
                  </span>
                )}
                wrapperStyle={{ paddingTop: "20px", color: "hsl(var(--foreground))" }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  // Graphique en barres (histogramme vertical)
  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--muted))" 
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              angle={0}
              textAnchor="middle"
              height={60}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              interval={0}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }} className="text-sm text-foreground">
                    {entry.payload.fullName}
                  </span>
                )}
                wrapperStyle={{ paddingTop: "20px", color: "hsl(var(--foreground))" }}
                iconType="circle"
              />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              className="cursor-pointer"
              animationDuration={800}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    transition: "opacity 0.2s",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
