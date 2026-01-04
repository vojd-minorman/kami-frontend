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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type BonType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function BonTypesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | number | null>(null)

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
    } catch (error) {
      console.error('Error loading bon types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de bon ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting(id)
      await api.deleteBonType(id)
      await loadBonTypes()
    } catch (error: any) {
      console.error('Error deleting bon type:', error)
      alert(error.message || 'Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Actif</Badge>
    }
    return <Badge variant="outline">Inactif</Badge>
  }

  return (
    <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Types de bons</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les types de bons disponibles dans le système
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => router.push('/dashboard/bon-types/create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer un type de bon
          </Button>
        </div>

        {/* Bon Types List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Liste des types de bons</CardTitle>
            <CardDescription className="text-sm">
              {bonTypes.length > 0 ? `${bonTypes.length} type(s) de bon trouvé(s)` : 'Aucun type de bon'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : bonTypes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucun type de bon trouvé
                </p>
                <Button
                  onClick={() => router.push('/dashboard/bon-types/create')}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre premier type de bon
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nom</TableHead>
                      <TableHead className="min-w-[100px]">Code</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonTypes.map((bonType) => (
                      <TableRow key={bonType.id}>
                        <TableCell className="font-medium">{bonType.name}</TableCell>
                        <TableCell className="font-mono text-sm">{bonType.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {bonType.description || 'Aucune description'}
                        </TableCell>
                        <TableCell>{getStatusBadge(bonType.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/templates/${bonType.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Gérer le template">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/bon-types/${bonType.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(bonType.id)}
                              disabled={deleting === bonType.id}
                              title="Supprimer"
                            >
                              {deleting === bonType.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

