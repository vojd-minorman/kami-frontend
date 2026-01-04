'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type BonType } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function CreateVoucherPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [selectedBonType, setSelectedBonType] = useState<BonType | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleBonTypeChange = (bonTypeId: string) => {
    const bonType = bonTypes.find(t => t.id.toString() === bonTypeId || t.id === bonTypeId)
    if (bonType) {
      // Parser formStructure si c'est une string JSON
      if (bonType.formStructure && typeof bonType.formStructure === 'string') {
        try {
          bonType.formStructure = JSON.parse(bonType.formStructure)
        } catch (e) {
          console.error('Error parsing formStructure:', e)
        }
      }
      // Si pas de formStructure mais des fields (relation), créer formStructure
      if (!bonType.formStructure?.fields && bonType.fields && bonType.fields.length > 0) {
        bonType.formStructure = {
          fields: bonType.fields.map(field => ({
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : undefined,
            validationRules: field.validationRules ? (typeof field.validationRules === 'string' ? JSON.parse(field.validationRules) : field.validationRules) : undefined,
            order: field.order,
          }))
        }
      }
    }
    setSelectedBonType(bonType || null)
    setFormData({})
    setErrors({})
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    // Effacer l'erreur pour ce champ
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!selectedBonType) {
      newErrors.bonTypeId = 'Veuillez sélectionner un type de bon'
    }

    // Valider les champs requis du formulaire dynamique
    if (selectedBonType?.formStructure?.fields) {
      selectedBonType.formStructure.fields.forEach((field: any) => {
        if (field.required && !formData[field.name]) {
          newErrors[field.name] = `${field.label || field.name} est requis`
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!selectedBonType) {
      return
    }

    try {
      setSaving(true)
      
      // Séparer les champs système des valeurs du formulaire dynamique
      const { siteId, siteName, ...dynamicValues } = formData
      
      const bonData = {
        bonTypeId: selectedBonType.id.toString(),
        siteId: siteId || undefined,
        siteName: siteName || undefined,
        values: dynamicValues, // Les valeurs du formulaire dynamique (sans siteId/siteName)
      }

      const createdBon = await api.createBon(bonData)
      
      // Rediriger vers la page de détails du bon créé
      router.push(`/dashboard/vouchers/${createdBon.id}`)
    } catch (error: any) {
      console.error('Error creating bon:', error)
      alert(error.message || 'Erreur lors de la création du bon')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: any) => {
    const fieldValue = formData[field.name] || ''
    const fieldError = errors[field.name]

    switch (field.type) {
      case 'text':
      case 'string':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || `Entrez ${field.label || field.name}`}
              className={fieldError ? 'border-destructive' : ''}
            />
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
              placeholder={field.placeholder || `Entrez ${field.label || field.name}`}
              className={fieldError ? 'border-destructive' : ''}
            />
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      case 'textarea':
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || `Entrez ${field.label || field.name}`}
              className={fieldError ? 'border-destructive' : ''}
              rows={field.rows || 4}
            />
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      case 'select':
      case 'dropdown':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger className={fieldError ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || `Sélectionnez ${field.label || field.name}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => (
                  <SelectItem key={option.value || option} value={option.value || option}>
                    {option.label || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={fieldError ? 'border-destructive' : ''}
            />
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || `Entrez ${field.label || field.name}`}
              className={fieldError ? 'border-destructive' : ''}
            />
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )
    }
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
          <Link href="/dashboard/vouchers">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Créer un bon</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Remplissez le formulaire pour créer un nouveau bon
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Informations générales</CardTitle>
              <CardDescription className="text-sm">
                Sélectionnez le type de bon et renseignez les informations de base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type de bon */}
              <div className="space-y-2">
                <Label htmlFor="bonTypeId">
                  Type de bon <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedBonType?.id.toString() || ''}
                  onValueChange={handleBonTypeChange}
                >
                  <SelectTrigger className={errors.bonTypeId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionnez un type de bon" />
                  </SelectTrigger>
                  <SelectContent>
                    {bonTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} {type.code && `(${type.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bonTypeId && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.bonTypeId}
                  </p>
                )}
                {selectedBonType?.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedBonType.description}
                  </p>
                )}
              </div>

              {/* Site ID et Site Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteId">ID du site</Label>
                  <Input
                    id="siteId"
                    value={formData.siteId || ''}
                    onChange={(e) => handleFieldChange('siteId', e.target.value)}
                    placeholder="Ex: SITE-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName || ''}
                    onChange={(e) => handleFieldChange('siteName', e.target.value)}
                    placeholder="Ex: Site principal"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire dynamique basé sur le type de bon */}
          {selectedBonType && selectedBonType.formStructure?.fields && (
            <Card className="border-border/50 mt-6">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Détails du bon</CardTitle>
                <CardDescription className="text-sm">
                  Remplissez les champs spécifiques à ce type de bon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedBonType.formStructure.fields.map((field: any) => renderField(field))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
            <Link href="/dashboard/vouchers">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Créer le bon
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  )
}

