'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus, GripVertical, Trash2 } from 'lucide-react'
import { api, type User } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface Signer {
  userId: string
  order: number
  user?: User
}

interface BonSignersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bonId: string
  onSuccess?: () => void
}

export function BonSignersDialog({ open, onOpenChange, bonId, onSuccess }: BonSignersDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [signers, setSigners] = useState<Signer[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const { toast } = useToast()

  // Charger les utilisateurs disponibles
  useEffect(() => {
    if (open) {
      loadUsers()
      loadSigners()
    }
  }, [open, bonId])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await api.getUsers({ limit: 100 })
      setAvailableUsers(response.data || [])
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive',
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSigners = async () => {
    try {
      const response = await api.getBonSigners(bonId)
      const signersWithOrder = response.signers.map((s, index) => ({
        userId: s.id,
        order: s.order ?? index + 1,
        user: {
          id: s.id,
          fullName: s.fullName,
          email: s.email,
          role: s.role,
        } as User,
      }))
      setSigners(signersWithOrder.sort((a, b) => a.order - b.order))
    } catch (error: any) {
      console.error('Error loading signers:', error)
      // Si le bon n'a pas encore de signataires, commencer avec une liste vide
      setSigners([])
    }
  }

  const addSigner = () => {
    if (!selectedUserId || selectedUserId === '__loading__' || selectedUserId === '__no_users__') {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un utilisateur',
        variant: 'destructive',
      })
      return
    }

    const user = availableUsers.find(u => u.id === selectedUserId)
    if (!user) return

    // Vérifier si l'utilisateur est déjà dans la liste
    if (signers.some(s => s.userId === selectedUserId)) {
      toast({
        title: 'Attention',
        description: 'Cet utilisateur est déjà dans la liste des signataires',
        variant: 'destructive',
      })
      return
    }

    const newOrder = signers.length > 0 ? Math.max(...signers.map(s => s.order)) + 1 : 1
    setSigners([...signers, {
      userId: selectedUserId,
      order: newOrder,
      user,
    }])
    setSelectedUserId('')
  }

  const removeSigner = (userId: string) => {
    setSigners(signers.filter(s => s.userId !== userId).map((s, index) => ({
      ...s,
      order: index + 1,
    })))
  }

  const moveSigner = (index: number, direction: 'up' | 'down') => {
    const newSigners = [...signers]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newSigners.length) return

    // Échanger les ordres
    const temp = newSigners[index].order
    newSigners[index].order = newSigners[targetIndex].order
    newSigners[targetIndex].order = temp

    // Trier par ordre
    newSigners.sort((a, b) => a.order - b.order)
    setSigners(newSigners)
  }

  const handleSave = async () => {
    if (signers.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins un signataire',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await api.addBonSigners(bonId, signers.map(s => ({
        userId: s.userId,
        order: s.order,
      })))

      toast({
        title: 'Succès',
        description: 'Signataires ajoutés avec succès',
      })

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error adding signers:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter les signataires',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les utilisateurs déjà ajoutés
  const availableForSelection = availableUsers.filter(
    u => !signers.some(s => s.userId === u.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les signataires</DialogTitle>
          <DialogDescription>
            Ajoutez les utilisateurs qui doivent signer ce bon et définissez leur ordre de signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sélection d'utilisateur */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="user-select">Ajouter un signataire</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <SelectItem value="__loading__" disabled>Chargement...</SelectItem>
                  ) : availableForSelection.length === 0 ? (
                    <SelectItem value="__no_users__" disabled>Aucun utilisateur disponible</SelectItem>
                  ) : (
                    availableForSelection.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.email}) - {user.role}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={addSigner}
              disabled={!selectedUserId || selectedUserId === '__loading__' || selectedUserId === '__no_users__' || loadingUsers}
              className="mt-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {/* Liste des signataires */}
          {signers.length > 0 && (
            <div className="space-y-2">
              <Label>Ordre de signature</Label>
              <div className="space-y-2 border rounded-lg p-4">
                {signers
                  .sort((a, b) => a.order - b.order)
                  .map((signer, index) => (
                    <div
                      key={signer.userId}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline" className="min-w-[2rem] justify-center">
                          {signer.order}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{signer.user?.fullName || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {signer.user?.email} - {signer.user?.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveSigner(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveSigner(index, 'down')}
                          disabled={index === signers.length - 1}
                          className="h-8 w-8"
                        >
                          <GripVertical className="h-4 w-4 -rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSigner(signer.userId)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Les signataires signeront dans l'ordre affiché (de haut en bas)
              </p>
            </div>
          )}

          {signers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun signataire ajouté. Ajoutez au moins un signataire pour continuer.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading || signers.length === 0}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

