'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PermissionGuard } from '@/components/permission-guard'
import { api, type Category } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function CategoriesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadCategories()
    }
  }, [user])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const cats = await api.getCategories({ status: 'active' })
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting(id)
      await api.deleteCategory(id)
      await loadCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
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
    <PermissionGuard permission="category.read">
      <DashboardShell>
        <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Catégories</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les catégories pour organiser vos types de documents
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => router.push('/dashboard/categories/create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer une catégorie
          </Button>
        </div>

        {/* Categories List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Liste des catégories</CardTitle>
            <CardDescription className="text-sm">
              {categories.length > 0 ? `${categories.length} catégorie(s) trouvée(s)` : 'Aucune catégorie'}
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
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucune catégorie trouvée
                </p>
                <Button
                  onClick={() => router.push('/dashboard/categories/create')}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre première catégorie
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nom</TableHead>
                      <TableHead className="min-w-[100px]">Code</TableHead>
                      <TableHead className="min-w-[150px]">Couleur</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[100px]">Statut</TableHead>
                      <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="font-mono text-sm">{category.code}</TableCell>
                        <TableCell>
                          {category.color ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border border-border"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-sm font-mono">{category.color}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {category.description || 'Aucune description'}
                        </TableCell>
                        <TableCell>{getStatusBadge(category.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/categories/${category.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(category.id)}
                              disabled={deleting === category.id}
                              title="Supprimer"
                            >
                              {deleting === category.id ? (
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
    </PermissionGuard>
  )
}
