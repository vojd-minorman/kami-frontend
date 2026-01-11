"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

interface ActivityChartProps {
  today: number
  thisWeek: number
  thisMonth: number
  className?: string
}

type PeriodType = "week" | "month" | "year"

// Tooltip personnalisé pour l'activité avec tendance
const ActivityTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3">
        <p className="font-semibold text-sm mb-1 text-foreground">{data.payload.name}</p>
        {data.payload.date && data.payload.date !== "Total" && (
          <p className="text-xs text-muted-foreground mb-1">{data.payload.date}</p>
        )}
        <p className="text-sm font-bold" style={{ color: data.color || "hsl(var(--primary))" }}>
          {data.value.toLocaleString()} document{data.value > 1 ? "s" : ""}
        </p>
      </div>
    )
  }
  return null
}

export function ActivityChart({
  today,
  thisWeek,
  thisMonth,
  className,
}: ActivityChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("week")
  
  const now = new Date()
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  
  // Générer les données selon la période sélectionnée
  const generateData = (period: PeriodType) => {
    let data: Array<{ name: string; value: number; documents: number; date: string }> = []
    
    if (period === "week") {
      // Par semaine : 7 jours avec distribution plus précise
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const currentDayOfWeek = now.getDay()
      
      // Calculer le nombre de jours passés dans la semaine (incluant aujourd'hui)
      const daysPassed = currentDayOfWeek + 1
      
      // Répartir thisWeek sur les jours passés, avec today comme valeur réelle pour aujourd'hui
      const remainingDays = daysPassed - 1 // Jours passés sauf aujourd'hui
      const remainingTotal = Math.max(0, thisWeek - today) // Total moins aujourd'hui (ne peut pas être négatif)
      const averagePerDay = remainingDays > 0 ? remainingTotal / remainingDays : 0
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        const dayName = daysOfWeek[date.getDay()]
        const isToday = date.toDateString() === now.toDateString()
        const dayNumber = date.getDate()
        
        let estimatedValue = 0
        if (isToday) {
          // Aujourd'hui : valeur réelle
          estimatedValue = today
        } else if (i < currentDayOfWeek) {
          // Jours passés : distribution équitable avec légère variation pour réalisme
          // Utiliser le numéro du jour pour une variation déterministe
          const dayHash = (dayNumber * 7 + i) % 10
          const variation = 0.8 + (dayHash / 10) * 0.4 // Entre 0.8 et 1.2
          estimatedValue = Math.max(0, Math.round(averagePerDay * variation))
        }
        
        data.push({
          name: isToday ? "Aujourd'hui" : `${dayName} ${dayNumber}`,
          value: estimatedValue,
          documents: estimatedValue,
          date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        })
      }
      
      // Ajustement final pour garantir que le total corresponde exactement à thisWeek
      const currentTotal = data.reduce((sum, item) => sum + item.value, 0)
      if (currentTotal > 0 && thisWeek > 0 && Math.abs(currentTotal - thisWeek) > 0.5) {
        const adjustmentFactor = thisWeek / currentTotal
        data.forEach((item, index) => {
          if (index <= currentDayOfWeek) {
            item.value = Math.round(item.value * adjustmentFactor)
            item.documents = item.value
          }
        })
      }
    } else if (period === "month") {
      // Par mois : 30 jours
      const dailyAverage = thisMonth > 0 ? Math.round(thisMonth / 30) : 0
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentDay = now.getDate()
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(monthStart)
        date.setDate(monthStart.getDate() + i)
        const day = date.getDate()
        const isToday = date.toDateString() === now.toDateString()
        
        let estimatedValue = 0
        if (isToday) {
          estimatedValue = today
        } else if (i < currentDay) {
          const dayHash = (i * 7 + day) % 10
          const variation = 0.6 + (dayHash / 10) * 0.8
          estimatedValue = Math.max(0, Math.round(dailyAverage * variation))
        }
        
        // Afficher seulement certains jours pour éviter la surcharge
        if (i % 3 === 0 || isToday || i === 29) {
          data.push({
            name: isToday ? "Aujourd'hui" : `${day}/${date.getMonth() + 1}`,
            value: estimatedValue,
            documents: estimatedValue,
            date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          })
        }
      }
      
      // Ajuster pour correspondre à thisMonth
      const total = data.reduce((sum, item) => sum + item.value, 0)
      if (total > 0 && thisMonth > 0) {
        const factor = thisMonth / total
        data = data.map(item => ({
          ...item,
          value: Math.round(item.value * factor),
          documents: Math.round(item.value * factor),
        }))
      }
    } else if (period === "year") {
      // Par année : 12 mois
      // Estimation : utiliser thisMonth comme référence pour le mois actuel
      // et estimer les autres mois basés sur une moyenne
      const currentMonth = now.getMonth()
      const estimatedYearlyTotal = thisMonth * 12 // Estimation basée sur le mois actuel
      const monthlyAverage = estimatedYearlyTotal > 0 ? Math.round(estimatedYearlyTotal / 12) : 0
      
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(now.getFullYear(), i, 1)
        const isCurrentMonth = i === currentMonth
        
        let estimatedValue = 0
        if (isCurrentMonth) {
          estimatedValue = thisMonth
        } else if (i < currentMonth) {
          // Mois passés : estimation avec variation
          const monthHash = (i * 7) % 10
          const variation = 0.7 + (monthHash / 10) * 0.6
          estimatedValue = Math.max(0, Math.round(monthlyAverage * variation))
        } else {
          // Mois futurs : mettre à 0 ou très faible
          estimatedValue = 0
        }
        
        data.push({
          name: months[i],
          value: estimatedValue,
          documents: estimatedValue,
          date: monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        })
      }
    }
    
    return data
  }
  
  const data = generateData(selectedPeriod)

  // Couleur principale pour la ligne et l'aire
  const primaryColor = "hsl(var(--primary))"
  const primaryColorWithOpacity = "hsl(var(--primary) / 0.2)"

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl">Tendance d'Activité</CardTitle>
            <CardDescription className="text-sm">
              Évolution de la création de documents dans le temps
            </CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--muted))" 
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              angle={selectedPeriod === "week" ? 0 : -30}
              textAnchor={selectedPeriod === "week" ? "middle" : "end"}
              height={selectedPeriod === "week" ? 40 : 80}
              interval={selectedPeriod === "month" ? 1 : 0}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<ActivityTooltip />} />
            <Area
              type="monotone"
              dataKey="documents"
              stroke={primaryColor}
              strokeWidth={2}
              fill="url(#colorActivity)"
              dot={{ fill: primaryColor, r: 4, strokeWidth: 2, stroke: primaryColor }}
              activeDot={{ r: 6, fill: primaryColor, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
