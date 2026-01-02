'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BonType {
  id: string
  name: string
  code: string
}

export default function CreateTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bonTypeId = searchParams.get('bonTypeId')
  const { t } = useLocale()
  
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [selectedBonTypeId, setSelectedBonTypeId] = useState(bonTypeId || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadBonTypes()
  }, [router])

  const loadBonTypes = async () => {
    try {
      const token = localStorage.getItem('token')
      // TODO: Appel API réel
      // const response = await fetch('http://localhost:3333/api/v1/bon-types', {
      //   headers: { Authorization: `Bearer ${token}` },
      // })
      // const data = await response.json()
      // setBonTypes(data)
      
      // Données de test
      setBonTypes([
        { id: '1', name: 'Bon de Sécurité', code: 'SEC' },
        { id: '2', name: 'Bon de Travail', code: 'TRAV' },
      ])
    } catch (error) {
      console.error('Error loading bon types:', error)
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.templates.create}</h1>
        <p className="text-muted-foreground">
          Créez un nouveau template PDF pour un type de bon
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration du template</CardTitle>
          <CardDescription>
            Sélectionnez le type de bon pour lequel créer le template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonType">Type de bon</Label>
            <Select value={selectedBonTypeId} onValueChange={setSelectedBonTypeId}>
              <SelectTrigger id="bonType">
                <SelectValue placeholder="Sélectionner un type de bon" />
              </SelectTrigger>
              <SelectContent>
                {bonTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleCreate} disabled={!selectedBonTypeId || loading}>
              {loading ? t.common.loading : 'Créer le template'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              {t.common.cancel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
