'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { Settings as SettingsIcon, User, Lock, Save, Eye, EyeOff } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard-shell'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { PushNotificationsSettings } from '@/components/push-notifications-settings'

export default function SettingsPage() {
  const { t } = useLocale()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  
  // État pour les informations personnelles
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [savingProfile, setSavingProfile] = useState(false)
  
  // État pour le changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Mettre à jour les valeurs quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleUpdateProfile = async () => {
    if (!user) return

    if (!fullName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom complet est requis',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingProfile(true)
      await api.updateProfile({ fullName: fullName.trim() })
      await refreshUser()
      toast({
        title: 'Succès',
        description: 'Vos informations ont été mises à jour avec succès',
      })
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour du profil',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingPassword(true)
      await api.changePassword({
        currentPassword,
        newPassword,
      })
      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été modifié avec succès',
      })
      // Réinitialiser les champs
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du changement de mot de passe',
        variant: 'destructive',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 md:h-8 md:w-8" />
            {t.nav.configuration || 'Paramètres'}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Gérez vos informations personnelles et votre mot de passe
          </p>
        </div>

        {/* Informations personnelles */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Informations personnelles</CardTitle>
                <CardDescription className="text-sm">
                  Modifiez vos informations personnelles (l'email ne peut pas être modifié)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Votre nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="max-w-md bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'adresse email ne peut pas être modifiée
              </p>
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={savingProfile || fullName.trim() === (user.fullName || '')}
              className="mt-4"
            >
              {savingProfile ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Changement de mot de passe */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Changer le mot de passe</CardTitle>
                <CardDescription className="text-sm">
                  Mettez à jour votre mot de passe pour sécuriser votre compte
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative max-w-md">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe actuel"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative max-w-md">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Entrez votre nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le mot de passe doit contenir au moins 8 caractères
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <div className="relative max-w-md">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmez votre nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="mt-4"
            >
              {savingPassword ? (
                <>
                  <Lock className="mr-2 h-4 w-4 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications push */}
        <PushNotificationsSettings />
      </div>
    </DashboardShell>
  )
}
