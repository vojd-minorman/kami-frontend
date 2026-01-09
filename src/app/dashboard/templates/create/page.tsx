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
import { api, type DocumentType } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentTypeId = searchParams.get('documentTypeId')
  const { t } = useLocale()
  const { user, loading: authLoading } = useAuth()
  
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState(documentTypeId || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      loadDocumentTypes()
    } else if (!authLoading && !user) {
      // Si l'utilisateur n'est pas authentifié, le hook useAuth redirige déjà vers /login
      setLoading(false)
    }
  }, [user, authLoading])

  const loadDocumentTypes = async () => {
    try {
      setLoading(true)
      const types = await api.getDocumentTypes()
      setDocumentTypes(types)
      if (documentTypeId) {
        setSelectedDocumentTypeId(documentTypeId)
      }
    } catch (error: any) {
      console.error('Error loading document types:', error)
      // Afficher un message d'erreur à l'utilisateur
      alert(`Erreur lors du chargement des types de documents: ${error?.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    if (!selectedDocumentTypeId) {
      alert('Veuillez sélectionner un type de document')
      return
    }

    // Rediriger vers l'éditeur
    router.push(`/dashboard/templates/${selectedDocumentTypeId}/edit`)
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
              Créez un nouveau template PDF pour un type de document
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Configuration du template</CardTitle>
          <CardDescription className="text-sm">
            Sélectionnez le type de document pour lequel créer le template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading || authLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette page.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="documentType" className="text-sm">Type de document</Label>
                <Select value={selectedDocumentTypeId} onValueChange={setSelectedDocumentTypeId}>
                  <SelectTrigger id="documentType">
                    <SelectValue placeholder="Sélectionner un type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Aucun type de document disponible
                      </div>
                    ) : (
                      documentTypes.map((type) => (
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
                  disabled={!selectedDocumentTypeId || documentTypes.length === 0}
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
