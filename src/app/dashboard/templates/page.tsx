'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Template {
  id: string
  name: string
  bonTypeId: string
  bonTypeName: string
  createdAt: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadTemplates()
  }, [router])

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      // TODO: Appel API réel
      // Pour l'instant, données de test
      setTemplates([])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.templates.title}</h1>
          <p className="text-muted-foreground">
            Gérez vos templates PDF pour les bons
          </p>
        </div>
        <Link href="/dashboard/templates/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.templates.create}
          </Button>
        </Link>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des templates</CardTitle>
          <CardDescription>
            Tous les templates PDF configurés pour vos types de bons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">{t.common.loading}</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Aucun template trouvé
              </p>
              <Link href="/dashboard/templates/create">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre premier template
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type de bon</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.bonTypeName}</TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/dashboard/templates/${template.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

