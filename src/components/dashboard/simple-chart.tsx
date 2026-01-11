"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface SimpleChartProps {
  title: string
  description?: string
  data: ChartDataPoint[]
  type?: "bar" | "pie" | "histogram"
  className?: string
}

export function SimpleChart({
  title,
  description,
  data,
  type = "bar",
  className,
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  if (type === "pie") {
    // Calculer les angles pour le graphique en secteurs
    const total = data.reduce((sum, d) => sum + d.value, 0)
    let currentAngle = -90 // Commencer en haut

    const colors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]

    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full max-w-[200px] h-auto">
              {data.map((point, index) => {
                const percentage = (point.value / total) * 100
                const angle = (point.value / total) * 360
                const startAngle = currentAngle
                const endAngle = currentAngle + angle

                const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
                const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
                const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
                const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)

                const largeArcFlag = angle > 180 ? 1 : 0

                const pathData = [
                  `M 100 100`,
                  `L ${x1} ${y1}`,
                  `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  `Z`,
                ].join(" ")

                currentAngle = endAngle

                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={point.color || colors[index % colors.length]}
                    className="transition-opacity hover:opacity-80"
                  />
                )
              })}
            </svg>
          </div>
          <div className="mt-4 space-y-2">
            {data.map((point, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        point.color || colors[index % colors.length],
                    }}
                  />
                  <span className="text-muted-foreground">{point.label}</span>
                </div>
                <span className="font-medium">
                  {point.value} ({((point.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Graphique histogramme (barres verticales)
  if (type === "histogram") {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-indigo-500",
    ]

    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Graphique histogramme */}
            <div className="flex items-end justify-between gap-2 h-[200px] pb-8 relative">
              {data.map((point, index) => {
                const percentage = (point.value / maxValue) * 100
                const height = `${percentage}%`
                
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2 group relative"
                  >
                    {/* Valeur au-dessus de la barre (tooltip au survol) */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <span className="text-xs font-semibold bg-background border border-border rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">
                        {point.value}
                      </span>
                    </div>
                    {/* Barre verticale */}
                    <div className="w-full flex items-end justify-center flex-1 min-h-0">
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer relative",
                          point.color || colors[index % colors.length]
                        )}
                        style={{ 
                          height: percentage > 0 ? height : '4px',
                          minHeight: '4px'
                        }}
                        title={`${point.label}: ${point.value}`}
                      />
                    </div>
                    {/* Label en bas */}
                    <div className="text-xs text-muted-foreground text-center min-h-[2.5rem] flex items-end justify-center px-1">
                      <span className="line-clamp-2 break-words">{point.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Légende */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.map((point, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{
                          backgroundColor: point.color || `hsl(var(--chart-${(index % 5) + 1}))`,
                        }}
                      />
                      <span className="text-muted-foreground truncate">{point.label}</span>
                    </div>
                    <span className="font-medium">{point.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Graphique en barres horizontales
  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((point, index) => {
            const percentage = (point.value / maxValue) * 100
            const colors = [
              "bg-blue-500",
              "bg-green-500",
              "bg-yellow-500",
              "bg-purple-500",
              "bg-pink-500",
            ]

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{point.label}</span>
                  <span className="font-medium">{point.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      point.color || colors[index % colors.length]
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
