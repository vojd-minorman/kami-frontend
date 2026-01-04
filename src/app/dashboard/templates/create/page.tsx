'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { api, type BonType } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bonTypeId = searchParams.get('bonTypeId')
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [selectedBonTypeId, setSelectedBonTypeId] = useState(bonTypeId || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadBonTypes()
    }
  }, [user])

  const loadBonTypes = async () => {
    try {
      setLoading(true)
      const types = await api.getBonTypes()
      setBonTypes(types)
      if (bonTypeId) {
        setSelectedBonTypeId(bonTypeId)
      }
    } catch (error) {
      console.error('Error loading bon types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    if (!selectedBonTypeId) {
      alert('Veuillez sélectionner un type de bon')
      return
    }

    // Rediriger vers l'éditeur
    router.push(`/dashboard/templates/${selectedBonTypeId}/edit`)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.templates.create || 'Créer un template'}</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Créez un nouveau template PDF pour un type de bon
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Configuration du template</CardTitle>
          <CardDescription className="text-sm">
            Sélectionnez le type de bon pour lequel créer le template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="bonType" className="text-sm">Type de bon</Label>
                <Select value={selectedBonTypeId} onValueChange={setSelectedBonTypeId}>
                  <SelectTrigger id="bonType">
                    <SelectValue placeholder="Sélectionner un type de bon" />
                  </SelectTrigger>
                  <SelectContent>
                    {bonTypes.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Aucun type de bon disponible
                      </div>
                    ) : (
                      bonTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name} ({type.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleCreate} 
                  disabled={!selectedBonTypeId || bonTypes.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  Créer le template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/templates')}
                  className="flex-1 sm:flex-none"
                >
                  {t.common.cancel || 'Annuler'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
