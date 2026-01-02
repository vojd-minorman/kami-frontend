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
import { Plus, Eye, Download } from 'lucide-react'
import Link from 'next/link'

interface Voucher {
  id: string
  number: string
  bonType: string
  status: string
  createdAt: string
}

export default function VouchersPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadVouchers()
  }, [router])

  const loadVouchers = async () => {
    try {
      const token = localStorage.getItem('token')
      // TODO: Appel API réel
      // Pour l'instant, données de test
      setVouchers([])
    } catch (error) {
      console.error('Error loading vouchers:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.nav.bons}</h1>
          <p className="text-muted-foreground">
            Gérez vos bons numériques
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer un bon
        </Button>
      </div>

      {/* Vouchers List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des bons</CardTitle>
          <CardDescription>
            Tous les bons numériques créés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">{t.common.loading}</p>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Aucun bon trouvé
              </p>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Créer votre premier bon
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Type de bon</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.number}</TableCell>
                    <TableCell>{voucher.bonType}</TableCell>
                    <TableCell>{voucher.status}</TableCell>
                    <TableCell>
                      {new Date(voucher.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
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



