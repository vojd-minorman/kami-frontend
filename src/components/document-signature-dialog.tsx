'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Pen, Type, Upload, CheckCircle2, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface DocumentSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  onSuccess?: (updatedDocument?: any) => void | Promise<void>
}

interface SavedSignature {
  id: string
  signatureType: 'digital' | 'visual'
  signatureData?: string
  isDefault: boolean
  createdAt: string
}

export function DocumentSignatureDialog({ open, onOpenChange, documentId, onSuccess }: DocumentSignatureDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [signatureType, setSignatureType] = useState<'name' | 'pad' | 'visual' | 'digital'>('name')
  const [signatureName, setSignatureName] = useState('')
  const [signatureId, setSignatureId] = useState<string>('')
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([])
  const [loadingSignatures, setLoadingSignatures] = useState(false)
  const { toast } = useToast()

  // Refs pour le canvas de signature
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const pointsRef = useRef<Array<{ x: number; y: number; pressure: number; timestamp: number }>>([])

  useEffect(() => {
    if (open) {
      loadSavedSignatures()
      resetSignature()
    }
  }, [open])

  const loadSavedSignatures = async () => {
    try {
      setLoadingSignatures(true)
      const response = await api.getSignatures()
      setSavedSignatures(response.signatures || [])
    } catch (error: any) {
      console.error('Error loading signatures:', error)
    } finally {
      setLoadingSignatures(false)
    }
  }

  const resetSignature = () => {
    setConsentGiven(false)
    setSignatureName('')
    setSignatureId('')
    setUploadedImage(null)
    pointsRef.current = []
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  // Gestion du pad de signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureType !== 'pad') return
    
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
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || signatureType !== 'pad') return

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

  // Générer la signature depuis le nom
  const generateFromName = async () => {
    if (!signatureName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nom',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      // Générer côté frontend et enregistrer côté backend
      const response = await api.generateSignatureFromName({
        name: signatureName,
        style: 'cursive',
      })
      
      // Utiliser directement la signature générée pour signer
      await handleSign('name', response.signatureDataUrl, undefined, signatureName)
    } catch (error: any) {
      console.error('Error generating signature:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer la signature',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  // Signer avec un fichier visuel
  const handleVisualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setUploadedImage(dataUrl)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'image',
        variant: 'destructive',
      })
    }
  }

  const signWithUploadedImage = async () => {
    if (!uploadedImage) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord télécharger une image',
        variant: 'destructive',
      })
      return
    }
    await handleSign('visual', uploadedImage)
  }

  // Signer avec le pad
  const signWithPad = async () => {
    if (pointsRef.current.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez dessiner votre signature',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      // Générer côté frontend et enregistrer côté backend
      const response = await api.createSignatureFromPad(pointsRef.current)
      // Utiliser la signature générée pour signer
      await handleSign('pad', response.signatureDataUrl)
    } catch (error: any) {
      console.error('Error creating signature from pad:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la signature',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fonction principale de signature
  const handleSign = async (
    type: 'name' | 'pad' | 'visual' | 'digital',
    signatureData?: string,
    savedSignatureId?: string,
    name?: string
  ) => {
    if (!consentGiven) {
      toast({
        title: 'Erreur',
        description: 'Vous devez donner votre consentement pour signer',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const signData: any = {
        consentGiven: true,
        signatureType: type,
      }

      if (savedSignatureId) {
        signData.signatureId = savedSignatureId
      } else if (signatureData) {
        signData.signatureData = signatureData
      } else if (name) {
        signData.signatureName = name
      }

      const response = await api.signDocument(documentId, signData)

      toast({
        title: 'Succès',
        description: 'Document signé avec succès',
      })

      // Fermer le dialog immédiatement après la signature réussie
      onOpenChange(false)

      // Appeler onSuccess avec les données de la réponse pour mettre à jour immédiatement
      // Cela permettra de masquer les boutons pour l'utilisateur qui vient de signer
      // et de les afficher pour le prochain signataire si c'est son tour
      if (onSuccess) {
        // Passer les données mises à jour pour une mise à jour immédiate
        // Le backend retourne déjà le document avec le statut et les approvers mis à jour
        if (response?.document) {
          // Appeler onSuccess avec les données mises à jour
          // Le composant parent pourra utiliser ces données pour mettre à jour immédiatement le state
          ;(onSuccess as any)(response.document)
        } else {
          // Si les données ne sont pas dans la réponse, recharger depuis l'API
          setTimeout(() => {
            onSuccess()
          }, 300)
        }
      }
    } catch (error: any) {
      console.error('Error signing document:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de signer le document',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Signer le document</DialogTitle>
          <DialogDescription>
            Choisissez votre méthode de signature préférée
          </DialogDescription>
        </DialogHeader>

        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="digital">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sauvegardée
            </TabsTrigger>
          </TabsList>

          {/* Signature depuis le nom */}
          <TabsContent value="name" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-name">Nom à utiliser pour la signature</Label>
              <Input
                id="signature-name"
                placeholder="Votre nom complet"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Une signature stylisée sera générée automatiquement à partir de votre nom
              </p>
            </div>
            <Button
              onClick={generateFromName}
              disabled={loading || !signatureName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Type className="mr-2 h-4 w-4" />
                  Générer et signer
                </>
              )}
            </Button>
          </TabsContent>

          {/* Signature avec pad */}
          <TabsContent value="pad" className="space-y-4">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pointsRef.current = []
                  if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d')
                    if (ctx) {
                      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                    }
                  }
                }}
                className="w-full"
              >
                Effacer
              </Button>
            </div>
            <Button
              onClick={signWithPad}
              disabled={loading || pointsRef.current.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Pen className="mr-2 h-4 w-4" />
                  Signer avec le pad
                </>
              )}
            </Button>
          </TabsContent>

          {/* Signature visuelle (upload) */}
          <TabsContent value="visual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-upload">Télécharger une image de signature</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/*"
                onChange={handleVisualUpload}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Formats acceptés: PNG, JPG, GIF. Taille recommandée: 300x100px
              </p>
            </div>
            {signatureType === 'visual' && uploadedImage && (
              <div className="space-y-2">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img
                    src={uploadedImage}
                    alt="Aperçu de la signature"
                    className="max-w-full h-32 object-contain mx-auto"
                  />
                </div>
                <Button
                  onClick={signWithUploadedImage}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Signer avec cette image
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Signatures sauvegardées */}
          <TabsContent value="digital" className="space-y-4">
            <div className="space-y-2">
              <Label>Sélectionner une signature sauvegardée</Label>
              {loadingSignatures ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
                </div>
              ) : savedSignatures.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-muted-foreground">
                    Aucune signature sauvegardée.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/dashboard/signatures')
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Créer une signature
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {savedSignatures.map((sig) => (
                    <div
                      key={sig.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                        signatureId === sig.id ? 'border-primary bg-muted' : ''
                      }`}
                      onClick={() => setSignatureId(sig.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {sig.signatureType === 'visual' ? 'Signature visuelle' : 'Signature numérique'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Créée le {new Date(sig.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {sig.signatureData && sig.signatureType === 'visual' && (
                          <img
                            src={sig.signatureData}
                            alt="Signature"
                            className="h-12 w-32 object-contain border rounded"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {signatureId && (
              <Button
                onClick={() => handleSign('digital', undefined, signatureId)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Signer avec cette signature
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {/* Consentement */}
        <div className="flex items-start space-x-2 pt-4 border-t">
          <Checkbox
            id="consent"
            checked={consentGiven}
            onCheckedChange={(checked) => setConsentGiven(checked === true)}
          />
          <Label
            htmlFor="consent"
            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Je confirme que je souhaite signer ce document de manière électronique et que cette signature a la même valeur juridique qu'une signature manuscrite.
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

