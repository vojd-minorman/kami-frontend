'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileSignature,
  Plus,
  Type,
  Pen,
  Upload,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  Star,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { PermissionGuard } from '@/components/permission-guard'
import { api } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SavedSignature {
  id: string
  signatureType: 'digital' | 'visual'
  signatureData?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  algorithm?: string
  hashAlgorithm?: string
}

export default function SignaturesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [signatures, setSignatures] = useState<SavedSignature[]>([])
  const [activeTab, setActiveTab] = useState<'name' | 'pad' | 'visual' | 'digital'>('name')
  
  // États pour la génération depuis le nom
  const [signatureName, setSignatureName] = useState('')
  const [generatingFromName, setGeneratingFromName] = useState(false)
  const [previewSignatureFromName, setPreviewSignatureFromName] = useState<string | null>(null)
  
  // États pour le pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const pointsRef = useRef<Array<{ x: number; y: number; pressure: number; timestamp: number }>>([])
  const [hasDrawnOnPad, setHasDrawnOnPad] = useState(false)
  
  // États pour l'upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // États pour les modals
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [signatureToDelete, setSignatureToDelete] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [signatureToView, setSignatureToView] = useState<SavedSignature | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      loadSignatures()
      // Pré-remplir le nom avec le nom de l'utilisateur
      if (user.fullName) {
        setSignatureName(user.fullName)
      }
    }
  }, [user])

  // Générer un aperçu depuis le nom (sans enregistrer)
  const handlePreviewFromName = () => {
    if (!signatureName.trim()) {
      setPreviewSignatureFromName(null)
      return
    }

    try {
      // Créer un canvas virtuel pour générer la signature
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Impossible de créer le contexte canvas')
      }

      // Style cursive
      const fontSize = 32
      const fontFamily = 'Brush Script MT, Brush Script, cursive'
      ctx.font = `italic ${fontSize}px ${fontFamily}`
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Ajouter une légère rotation pour un effet plus naturel
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((Math.random() * 0.1 - 0.05) * Math.PI)

      // Dessiner le nom
      const offsetX = (Math.random() * 4 - 2)
      const offsetY = (Math.random() * 4 - 2)
      ctx.fillText(signatureName, offsetX, offsetY)

      // Pas de ligne sous la signature (demandé par l'utilisateur)
      ctx.restore()

      // Convertir en data URL
      const dataUrl = canvas.toDataURL('image/png')
      setPreviewSignatureFromName(dataUrl)
    } catch (error) {
      console.error('Error generating preview:', error)
      setPreviewSignatureFromName(null)
    }
  }

  // Mettre à jour l'aperçu quand le nom change (avec délai)
  useEffect(() => {
    if (signatureName.trim()) {
      // Délai pour éviter trop de générations
      const timeoutId = setTimeout(() => {
        handlePreviewFromName()
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setPreviewSignatureFromName(null)
    }
  }, [signatureName])

  const loadSignatures = async () => {
    try {
      setLoading(true)
      const response = await api.getSignatures()
      setSignatures(response.signatures || [])
    } catch (error: any) {
      console.error('Error loading signatures:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les signatures',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Générer depuis le nom
  const handleGenerateFromName = async () => {
    if (!signatureName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nom',
        variant: 'destructive',
      })
      return
    }

    if (!previewSignatureFromName) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord générer un aperçu',
        variant: 'destructive',
      })
      return
    }

    // Vérifier la limite de 4 signatures
    if (signatures.length >= 4) {
      toast({
        title: 'Limite atteinte',
        description: 'Vous avez atteint la limite de 4 signatures. Veuillez supprimer une signature existante avant d\'en créer une nouvelle.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingFromName(true)
      await api.generateSignatureFromName({
        name: signatureName,
        style: 'cursive',
      })
      toast({
        title: 'Succès',
        description: 'Signature générée et enregistrée avec succès',
      })
      await loadSignatures()
      setPreviewSignatureFromName(null)
      if (user?.fullName && signatureName === user.fullName) {
        // Garder le nom de l'utilisateur
      } else {
        setSignatureName('')
      }
    } catch (error: any) {
      console.error('Error generating signature:', error)
      toast({
        title: 'Erreur',
        description: error.message || error.response?.data?.message || 'Impossible de générer la signature',
        variant: 'destructive',
      })
    } finally {
      setGeneratingFromName(false)
    }
  }

  // Gestion du pad
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'pad') return
    isDrawingRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    pointsRef.current.push({
      x: (x / rect.width) * canvas.width,
      y: (y / rect.height) * canvas.height,
      pressure: 1,
      timestamp: Date.now(),
    })
    setHasDrawnOnPad(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activeTab !== 'pad') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height

    pointsRef.current.push({
      x: canvasX,
      y: canvasY,
      pressure: 1,
      timestamp: Date.now(),
    })
    setHasDrawnOnPad(true)

    const lastPoint = pointsRef.current[pointsRef.current.length - 2]
    if (lastPoint) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(canvasX, canvasY)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearPad = () => {
    pointsRef.current = []
    setHasDrawnOnPad(false)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  const handleSaveFromPad = async () => {
    if (!hasDrawnOnPad || pointsRef.current.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez dessiner votre signature',
        variant: 'destructive',
      })
      return
    }

    // Vérifier la limite de 4 signatures
    if (signatures.length >= 4) {
      toast({
        title: 'Limite atteinte',
        description: 'Vous avez atteint la limite de 4 signatures. Veuillez supprimer une signature existante avant d\'en créer une nouvelle.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)
      // Générer l'image depuis le canvas en PNG
      const canvas = canvasRef.current
      if (!canvas) {
        toast({
          title: 'Erreur',
          description: 'Canvas non disponible',
          variant: 'destructive',
        })
        return
      }
      
      // Convertir le canvas en PNG (base64)
      const signatureDataUrl = canvas.toDataURL('image/png')
      
      if (!signatureDataUrl || signatureDataUrl === 'data:,') {
        toast({
          title: 'Erreur',
          description: 'Impossible de générer l\'image de la signature',
          variant: 'destructive',
        })
        return
      }
      
      // Envoyer l'image PNG au backend
      await api.createVisualSignature(signatureDataUrl)
      toast({
        title: 'Succès',
        description: 'Signature enregistrée avec succès',
      })
      await loadSignatures()
      clearPad()
    } catch (error: any) {
      console.error('Error saving signature from pad:', error)
      toast({
        title: 'Erreur',
        description: error.message || error.response?.data?.message || 'Impossible d\'enregistrer la signature',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  // Gestion de l'upload - convertir en PNG base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
        variant: 'destructive',
      })
      return
    }

    // Convertir l'image en PNG base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      
      // Créer un canvas pour convertir en PNG
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          // Convertir en PNG base64
          const pngDataUrl = canvas.toDataURL('image/png')
          setUploadedImage(pngDataUrl)
        } else {
          setUploadedImage(dataUrl) // Fallback si canvas n'est pas disponible
        }
      }
      img.onerror = () => {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger l\'image',
          variant: 'destructive',
        })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleSaveFromUpload = async () => {
    if (!uploadedImage) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord télécharger une image',
        variant: 'destructive',
      })
      return
    }

    // Vérifier la limite de 4 signatures
    if (signatures.length >= 4) {
      toast({
        title: 'Limite atteinte',
        description: 'Vous avez atteint la limite de 4 signatures. Veuillez supprimer une signature existante avant d\'en créer une nouvelle.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)
      await api.createVisualSignature(uploadedImage)
      toast({
        title: 'Succès',
        description: 'Signature enregistrée avec succès',
      })
      await loadSignatures()
      setUploadedImage(null)
    } catch (error: any) {
      console.error('Error saving signature from upload:', error)
      toast({
        title: 'Erreur',
        description: error.message || error.response?.data?.message || 'Impossible d\'enregistrer la signature',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  // Définir une signature comme actuelle/par défaut
  const handleSetAsDefault = async (signatureId: string) => {
    try {
      await api.updateSignature(signatureId, { isDefault: true })
      toast({
        title: 'Succès',
        description: 'Signature définie comme signature actuelle',
      })
      await loadSignatures()
    } catch (error: any) {
      console.error('Error setting signature as default:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de définir la signature comme actuelle',
        variant: 'destructive',
      })
    }
  }

  // Ouvrir le dialog de suppression
  const handleDeleteClick = (signatureId: string) => {
    setSignatureToDelete(signatureId)
    setDeleteDialogOpen(true)
  }

  // Supprimer une signature
  const handleDeleteSignature = async () => {
    if (!signatureToDelete) return

    try {
      setDeleting(true)
      await api.deleteSignature(signatureToDelete)
      toast({
        title: 'Succès',
        description: 'Signature supprimée avec succès',
      })
      await loadSignatures()
      setDeleteDialogOpen(false)
      setSignatureToDelete(null)
    } catch (error: any) {
      console.error('Error deleting signature:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la signature',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Ouvrir le modal de visualisation
  const handleViewSignature = (signature: SavedSignature) => {
    setSignatureToView(signature)
    setViewDialogOpen(true)
  }

  // Réinitialiser le pad quand on change d'onglet
  useEffect(() => {
    if (activeTab !== 'pad') {
      pointsRef.current = []
      setHasDrawnOnPad(false)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
    }
  }, [activeTab])

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  return (
    <PermissionGuard permission="signature.read">
      <DashboardShell>
        <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mes signatures</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Gérez vos signatures numériques pour signer les documents
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Créer une nouvelle signature */}
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Créer une nouvelle signature
              </CardTitle>
              <CardDescription>
                Choisissez votre méthode préférée pour créer une signature
                {signatures.length >= 4 && (
                  <span className="block mt-1 text-destructive font-medium">
                    Limite atteinte : Vous avez déjà 4 signatures. Supprimez-en une pour en créer une nouvelle.
                  </span>
                )}
                {signatures.length < 4 && (
                  <span className="block mt-1 text-muted-foreground">
                    {signatures.length} / 4 signatures créées
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="name">
                    <Type className="h-4 w-4 mr-2" />
                    Nom
                  </TabsTrigger>
                  <TabsTrigger value="pad">
                    <Pen className="h-4 w-4 mr-2" />
                    Pad
                  </TabsTrigger>
                  <TabsTrigger value="visual">
                    <Upload className="h-4 w-4 mr-2" />
                    Image
                  </TabsTrigger>
                </TabsList>

                {/* Signature depuis le nom */}
                <TabsContent value="name" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signature-name">Nom à utiliser pour la signature</Label>
                    <Input
                      id="signature-name"
                      placeholder="Votre nom complet"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Une signature stylisée sera générée automatiquement à partir de votre nom. L'aperçu se met à jour automatiquement.
                    </p>
                  </div>
                  
                  {/* Aperçu de la signature */}
                  {previewSignatureFromName && (
                    <div className="space-y-2">
                      <Label>Aperçu de la signature</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50 flex items-center justify-center min-h-[120px]">
                        <img
                          src={previewSignatureFromName}
                          alt="Aperçu de la signature"
                          className="max-w-full max-h-32 object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        L'aperçu est généré automatiquement. Vous pouvez modifier le nom pour voir un autre aperçu.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePreviewFromName}
                      disabled={!signatureName.trim()}
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Actualiser l'aperçu
                    </Button>
                    <Button
                      onClick={handleGenerateFromName}
                      disabled={generatingFromName || !signatureName.trim() || !previewSignatureFromName || signatures.length >= 4}
                      className="flex-1"
                    >
                      {generatingFromName ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* Signature avec pad */}
                <TabsContent value="pad" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Dessinez votre signature</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        className="w-full h-48 border rounded bg-white cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearPad}
                        className="flex-1"
                      >
                        Effacer
                      </Button>
                      <Button
                        onClick={handleSaveFromPad}
                        disabled={uploading || !hasDrawnOnPad || signatures.length >= 4}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Pen className="mr-2 h-4 w-4" />
                            Enregistrer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Signature visuelle (upload) */}
                <TabsContent value="visual" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signature-upload">Télécharger une image de signature</Label>
                    <Input
                      id="signature-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formats acceptés: PNG, JPG, GIF. Taille recommandée: 300x100px
                    </p>
                    {uploadedImage && (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <img
                          src={uploadedImage}
                          alt="Aperçu de la signature"
                          className="max-w-full h-32 object-contain mx-auto"
                        />
                      </div>
                    )}
                  </div>
                  {uploadedImage && (
                    <Button
                      onClick={handleSaveFromUpload}
                      disabled={uploading || signatures.length >= 4}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Enregistrer cette signature
                        </>
                      )}
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Signatures sauvegardées */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Mes signatures</CardTitle>
              <CardDescription>
                {signatures.length} signature(s) enregistrée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signatures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Aucune signature enregistrée</p>
                  <p className="text-xs mt-2">Créez votre première signature ci-contre</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                        sig.isDefault ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleViewSignature(sig)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={sig.signatureType === 'visual' ? 'default' : 'secondary'}>
                              {sig.signatureType === 'visual' ? 'Visuelle' : 'Numérique'}
                            </Badge>
                            {sig.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Actuelle
                              </Badge>
                            )}
                          </div>
                          {sig.signatureData && (
                            <img
                              src={sig.signatureData}
                              alt="Signature"
                              className="h-16 w-auto object-contain border rounded bg-white mb-2"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Créée le {new Date(sig.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                          {!sig.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSetAsDefault(sig.id)}
                              className="h-8 w-8"
                              title="Définir comme signature actuelle"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(sig.id)}
                            className="h-8 w-8 text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette signature ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSignature}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de visualisation de signature */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Visualisation de la signature
            </DialogTitle>
            <DialogDescription>
              {signatureToView && (
                <>
                  Signature {signatureToView.signatureType === 'visual' ? 'visuelle' : 'numérique'}
                  {signatureToView.isDefault && ' (Actuelle)'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {signatureToView && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={signatureToView.signatureType === 'visual' ? 'default' : 'secondary'}>
                  {signatureToView.signatureType === 'visual' ? 'Visuelle' : 'Numérique'}
                </Badge>
                {signatureToView.isDefault && (
                  <Badge variant="default" className="text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Signature actuelle
                  </Badge>
                )}
              </div>
              
              {signatureToView.signatureData ? (
                <div className="border-2 border-dashed rounded-lg p-8 bg-muted/50 flex items-center justify-center min-h-[200px]">
                  <img
                    src={signatureToView.signatureData}
                    alt="Signature"
                    className="max-w-full max-h-64 object-contain"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 bg-muted/50 flex items-center justify-center min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <FileSignature className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Signature numérique</p>
                    <p className="text-xs mt-2">
                      {signatureToView.algorithm && `Algorithme: ${signatureToView.algorithm}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Créée le :</strong>{' '}
                  {new Date(signatureToView.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {signatureToView.algorithm && (
                  <p>
                    <strong>Algorithme :</strong> {signatureToView.algorithm}
                  </p>
                )}
                {signatureToView.hashAlgorithm && (
                  <p>
                    <strong>Hash :</strong> {signatureToView.hashAlgorithm}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardShell>
    </PermissionGuard>
  )
}

