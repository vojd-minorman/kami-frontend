'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Loader2, AlertCircle, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type BonType, type BonField } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function EditBonTypePage() {
  const router = useRouter()
  const params = useParams()
  const bonTypeId = params?.id as string
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bonType, setBonType] = useState<BonType | null>(null)
  const [fields, setFields] = useState<BonField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Dialog pour créer/modifier un champ
  const [showFieldDialog, setShowFieldDialog] = useState(false)
  const [editingField, setEditingField] = useState<BonField | null>(null)
  const [fieldFormData, setFieldFormData] = useState({
    name: '',
    label: '',
    type: 'text' as BonField['type'],
    required: false,
    options: '',
    validationRules: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [savingField, setSavingField] = useState(false)
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)

  useEffect(() => {
    if (user && bonTypeId) {
      loadBonType()
      loadFields()
    }
  }, [user, bonTypeId])

  const loadBonType = async () => {
    try {
      setLoading(true)
      const data = await api.getBonType(bonTypeId)
      setBonType(data)
      setFormData({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        status: data.status || 'active',
      })
    } catch (error: any) {
      console.error('Error loading bon type:', error)
      alert(error.message || 'Erreur lors du chargement du type de bon')
      router.push('/dashboard/bon-types')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    try {
      setLoadingFields(true)
      const fieldsData = await api.getBonFields(bonTypeId)
      setFields(fieldsData)
    } catch (error: any) {
      console.error('Error loading fields:', error)
    } finally {
      setLoadingFields(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis'
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Le code est requis'
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Le code doit contenir uniquement des majuscules, chiffres, tirets et underscores'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !bonType) {
      return
    }

    try {
      setSaving(true)
      
      const bonTypeData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        status: formData.status,
      }

      await api.updateBonType(bonTypeId, bonTypeData)
      
      // Recharger les données
      await loadBonType()
    } catch (error: any) {
      console.error('Error updating bon type:', error)
      alert(error.message || 'Erreur lors de la mise à jour du type de bon')
    } finally {
      setSaving(false)
    }
  }

  // Gestion des champs
  const openFieldDialog = (field?: BonField) => {
    if (field) {
      setEditingField(field)
      setFieldFormData({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options && typeof field.options === 'object' 
          ? JSON.stringify(field.options, null, 2) 
          : (field.options as string) || '',
        validationRules: field.validationRules && typeof field.validationRules === 'object'
          ? JSON.stringify(field.validationRules, null, 2)
          : (field.validationRules as string) || '',
      })
    } else {
      setEditingField(null)
      setFieldFormData({
        name: '',
        label: '',
        type: 'text',
        required: false,
        options: '',
        validationRules: '',
      })
    }
    setFieldErrors({})
    setShowFieldDialog(true)
  }

  const validateFieldForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!fieldFormData.name.trim()) {
      newErrors.name = 'Le nom est requis'
    } else if (!/^[a-z][a-z0-9_]*$/.test(fieldFormData.name)) {
      newErrors.name = 'Le nom doit commencer par une lettre et ne contenir que des lettres minuscules, chiffres et underscores'
    }
    
    if (!fieldFormData.label.trim()) {
      newErrors.label = 'Le label est requis'
    }

    // Vérifier l'unicité du nom
    const existingField = fields.find(f => 
      f.name === fieldFormData.name && (!editingField || f.id !== editingField.id)
    )
    if (existingField) {
      newErrors.name = 'Un champ avec ce nom existe déjà'
    }

    // Valider les options JSON pour les champs select
    if (fieldFormData.type === 'select' && fieldFormData.options.trim()) {
      try {
        JSON.parse(fieldFormData.options)
      } catch {
        newErrors.options = 'Les options doivent être au format JSON valide (ex: ["Option 1", "Option 2"])'
      }
    }

    // Valider les règles de validation JSON
    if (fieldFormData.validationRules.trim()) {
      try {
        JSON.parse(fieldFormData.validationRules)
      } catch {
        newErrors.validationRules = 'Les règles de validation doivent être au format JSON valide'
      }
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveField = async () => {
    if (!validateFieldForm()) {
      return
    }

    try {
      setSavingField(true)

      const fieldData: any = {
        name: fieldFormData.name.trim(),
        label: fieldFormData.label.trim(),
        type: fieldFormData.type,
        required: fieldFormData.required,
        order: editingField?.order || fields.length,
      }

      // Parser les options et validationRules si fournis
      if (fieldFormData.options.trim()) {
        fieldData.options = JSON.parse(fieldFormData.options)
      }
      if (fieldFormData.validationRules.trim()) {
        fieldData.validationRules = JSON.parse(fieldFormData.validationRules)
      }

      if (editingField) {
        await api.updateBonField(bonTypeId, editingField.id, fieldData)
      } else {
        await api.createBonField(bonTypeId, fieldData)
      }

      setShowFieldDialog(false)
      await loadFields()
    } catch (error: any) {
      console.error('Error saving field:', error)
      alert(error.message || 'Erreur lors de la sauvegarde du champ')
    } finally {
      setSavingField(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce champ ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeletingFieldId(fieldId)
      await api.deleteBonField(bonTypeId, fieldId)
      await loadFields()
    } catch (error: any) {
      console.error('Error deleting field:', error)
      alert(error.message || 'Erreur lors de la suppression du champ')
    } finally {
      setDeletingFieldId(null)
    }
  }

  const getTypeBadge = (type: BonField['type']) => {
    const colors: Record<BonField['type'], string> = {
      text: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      number: 'bg-green-500/10 text-green-500 border-green-500/20',
      date: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      datetime: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      select: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      checkbox: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    }
    return <Badge variant="outline" className={colors[type]}>{type}</Badge>
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link href="/dashboard/bon-types">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Modifier le type de bon</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              {bonType?.name || 'Chargement...'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Informations générales</CardTitle>
              <CardDescription className="text-sm">
                Modifiez les informations du type de bon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Bon de livraison"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  placeholder="Ex: BDL"
                  className={errors.code ? 'border-destructive' : ''}
                  maxLength={20}
                />
                {errors.code && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.code}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Description du type de bon..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Section Champs */}
          <Card className="border-border/50 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">Champs du formulaire</CardTitle>
                  <CardDescription className="text-sm">
                    Définissez les champs qui composeront le formulaire de création de bons
                  </CardDescription>
                </div>
                <Button type="button" onClick={() => openFieldDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un champ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFields ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Aucun champ défini. Ajoutez des champs pour créer la structure du formulaire.
                  </p>
                  <Button type="button" variant="outline" onClick={() => openFieldDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter le premier champ
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordre</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requis</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-mono text-sm">{field.order}</TableCell>
                          <TableCell className="font-mono text-sm">{field.name}</TableCell>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>{getTypeBadge(field.type)}</TableCell>
                          <TableCell>
                            {field.required ? (
                              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Oui
                              </Badge>
                            ) : (
                              <Badge variant="outline">Non</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openFieldDialog(field)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteField(field.id)}
                                disabled={deletingFieldId === field.id}
                              >
                                {deletingFieldId === field.id ? (
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
            <Link href="/dashboard/bon-types">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Dialog pour créer/modifier un champ */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Modifier le champ' : 'Créer un nouveau champ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field-name">
                  Nom (technique) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="field-name"
                  value={fieldFormData.name}
                  onChange={(e) => {
                    setFieldFormData(prev => ({ ...prev, name: e.target.value }))
                    if (fieldErrors.name) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.name
                        return newErrors
                      })
                    }
                  }}
                  placeholder="ex: client_name"
                  className={fieldErrors.name ? 'border-destructive' : ''}
                  disabled={!!editingField}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Identifiant unique (lettres minuscules, chiffres, underscores)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-label">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="field-label"
                  value={fieldFormData.label}
                  onChange={(e) => {
                    setFieldFormData(prev => ({ ...prev, label: e.target.value }))
                    if (fieldErrors.label) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.label
                        return newErrors
                      })
                    }
                  }}
                  placeholder="Ex: Nom du client"
                  className={fieldErrors.label ? 'border-destructive' : ''}
                />
                {fieldErrors.label && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.label}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Texte affiché dans le formulaire
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field-type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={fieldFormData.type}
                  onValueChange={(value: BonField['type']) => {
                    setFieldFormData(prev => ({ ...prev, type: value }))
                  }}
                >
                  <SelectTrigger id="field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texte</SelectItem>
                    <SelectItem value="number">Nombre</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="datetime">Date et heure</SelectItem>
                    <SelectItem value="select">Sélection</SelectItem>
                    <SelectItem value="checkbox">Case à cocher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={fieldFormData.required}
                    onChange={(e) => setFieldFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="field-required" className="cursor-pointer">
                    Champ requis
                  </Label>
                </div>
              </div>
            </div>

            {fieldFormData.type === 'select' && (
              <div className="space-y-2">
                <Label htmlFor="field-options">
                  Options (JSON) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="field-options"
                  value={fieldFormData.options}
                  onChange={(e) => {
                    setFieldFormData(prev => ({ ...prev, options: e.target.value }))
                    if (fieldErrors.options) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.options
                        return newErrors
                      })
                    }
                  }}
                  placeholder='["Option 1", "Option 2", "Option 3"]'
                  rows={4}
                  className={fieldErrors.options ? 'border-destructive' : ''}
                />
                {fieldErrors.options && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.options}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tableau JSON des options disponibles
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="field-validation">
                Règles de validation (JSON optionnel)
              </Label>
              <Textarea
                id="field-validation"
                value={fieldFormData.validationRules}
                onChange={(e) => {
                  setFieldFormData(prev => ({ ...prev, validationRules: e.target.value }))
                  if (fieldErrors.validationRules) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.validationRules
                      return newErrors
                    })
                  }
                }}
                placeholder='{"min": 0, "max": 100}'
                rows={3}
                className={fieldErrors.validationRules ? 'border-destructive' : ''}
              />
              {fieldErrors.validationRules && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.validationRules}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Règles de validation au format JSON (ex: {'{"min": 0, "max": 100, "pattern": "^[A-Z]"}'} )
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFieldDialog(false)}
              disabled={savingField}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveField}
              disabled={savingField}
            >
              {savingField ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingField ? 'Modifier' : 'Créer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
