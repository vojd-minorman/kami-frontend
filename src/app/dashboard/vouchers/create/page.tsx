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
import { ArrowLeft, Save, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api, type BonType, type BonFieldGroup } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function CreateVoucherPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bonTypes, setBonTypes] = useState<BonType[]>([])
  const [selectedBonType, setSelectedBonType] = useState<BonType | null>(null)
  const [fieldGroups, setFieldGroups] = useState<BonFieldGroup[]>([])
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
      console.log('Loaded bon types:', types)
      console.log('Bon types with fields:', types.map(t => ({ id: t.id, name: t.name, fieldsCount: t.fields?.length || 0, hasFormStructure: !!t.formStructure })))
      setBonTypes(types)
    } catch (error) {
      console.error('Error loading bon types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBonTypeChange = async (bonTypeId: string) => {
    const bonType = bonTypes.find(t => t.id.toString() === bonTypeId || t.id === bonTypeId)
    console.log('Selected bon type:', bonType)
    
    if (bonType) {
      // Si les fields ne sont pas chargés, les charger
      if (!bonType.fields || bonType.fields.length === 0) {
        console.log('Fields not loaded, fetching from API...')
        try {
          const fields = await api.getBonFields(bonTypeId)
          console.log('Loaded fields from API:', fields)
          bonType.fields = fields
        } catch (error) {
          console.error('Error loading bon fields:', error)
        }
      } else {
        console.log('Fields already loaded:', bonType.fields)
      }

      // Parser formStructure si c'est une string JSON
      if (bonType.formStructure && typeof bonType.formStructure === 'string') {
        try {
          bonType.formStructure = JSON.parse(bonType.formStructure)
        } catch (e) {
          console.error('Error parsing formStructure:', e)
        }
      }
      
      // Si pas de formStructure OU formStructure.fields est vide, mais qu'on a des fields (relation), créer formStructure
      const hasFormStructureFields = bonType.formStructure?.fields && bonType.formStructure.fields.length > 0
      const hasFields = bonType.fields && bonType.fields.length > 0
      
      if (!hasFormStructureFields && hasFields) {
        console.log('Creating formStructure from fields:', bonType.fields)
        // Séparer les champs simples (sans groupe) des champs dans des groupes
        const simpleFields = (bonType.fields || []).filter(f => !f.bonFieldGroupId)
        bonType.formStructure = {
          ...(bonType.formStructure || {}),
          fields: simpleFields.map(field => {
            // Parser les options pour les champs select
            let parsedOptions = undefined
            if (field.options) {
              if (typeof field.options === 'string') {
                try {
                  parsedOptions = JSON.parse(field.options)
                } catch (e) {
                  console.error('Error parsing field options:', e)
                  // Si le parsing échoue, essayer de traiter comme un tableau de strings
                  parsedOptions = field.options.split(',').map((opt: string) => opt.trim())
                }
              } else {
                parsedOptions = field.options
              }
            }

            // Parser les validationRules
            let parsedValidationRules = undefined
            if (field.validationRules) {
              if (typeof field.validationRules === 'string') {
                try {
                  parsedValidationRules = JSON.parse(field.validationRules)
                } catch (e) {
                  console.error('Error parsing field validationRules:', e)
                }
              } else {
                parsedValidationRules = field.validationRules
              }
            }

            return {
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.required,
              options: parsedOptions,
              validationRules: parsedValidationRules,
              order: field.order,
            }
          })
        }
        console.log('Created formStructure:', bonType.formStructure)
      } else if (hasFormStructureFields) {
        // Filtrer les champs qui appartiennent à un groupe (ils doivent être dans les groupes, pas dans formStructure)
        console.log('Using existing formStructure, filtering group fields:', bonType.formStructure)
        if (bonType.fields && bonType.fields.length > 0) {
          // Créer un map des bonFieldGroupId pour vérifier rapidement
          const fieldsInGroups = new Set(
            bonType.fields.filter(f => f.bonFieldGroupId).map(f => f.name)
          )
          
          // Filtrer formStructure.fields pour exclure les champs qui sont dans un groupe
          if (bonType.formStructure && bonType.formStructure.fields) {
            bonType.formStructure.fields = bonType.formStructure.fields.filter(
              (field: any) => !fieldsInGroups.has(field.name)
            )
            console.log('Filtered formStructure fields (excluded group fields):', bonType.formStructure.fields)
          }
        }
      } else {
        console.warn('No fields and no formStructure for bon type:', bonType)
      }
    }
    
    console.log('Final selected bon type:', bonType)
    console.log('Form structure fields:', bonType?.formStructure?.fields)
    
    // Charger les groupes de champs (depuis bonType.fieldGroups si disponibles, sinon depuis l'API)
    // et initialiser formData avec une ligne par défaut pour chaque groupe répétable
    const initializeGroups = async () => {
      if (!bonType) return
      
      let groupsToUse: BonFieldGroup[] = []
      
      if (bonType.fieldGroups && bonType.fieldGroups.length > 0) {
        // Trier par ordre
        groupsToUse = [...bonType.fieldGroups].sort((a, b) => a.order - b.order)
        setFieldGroups(groupsToUse)
      } else {
        // Charger depuis l'API
        try {
          const groups = await api.getBonFieldGroups(bonType.id.toString())
          // Trier par ordre
          groupsToUse = groups.sort((a, b) => a.order - b.order)
          setFieldGroups(groupsToUse)
        } catch (error) {
          console.error('Error loading field groups:', error)
          setFieldGroups([])
        }
      }
      
      // Initialiser formData avec une ligne par défaut pour chaque groupe répétable
      const initialFormData: Record<string, any> = {}
      groupsToUse.forEach(group => {
        if (group.isRepeatable) {
          initialFormData[group.name] = [{}] // Une ligne vide par défaut
        } else {
          initialFormData[group.name] = {} // Objet vide pour les groupes simples
        }
      })
      
      setFormData(prev => ({ ...prev, ...initialFormData }))
    }
    
    initializeGroups()
    setSelectedBonType(bonType || null)
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

  // Gérer les changements dans un groupe répétable
  const handleGroupFieldChange = (groupName: string, rowIndex: number, fieldName: string, value: any) => {
    setFormData(prev => {
      const currentGroup = prev[groupName] || []
      const newGroup = [...currentGroup]
      if (!newGroup[rowIndex]) {
        newGroup[rowIndex] = {}
      }
      newGroup[rowIndex] = {
        ...newGroup[rowIndex],
        [fieldName]: value
      }
      return {
        ...prev,
        [groupName]: newGroup
      }
    })
    
    // Effacer l'erreur
    const errorKey = `${groupName}[${rowIndex}].${fieldName}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Gérer les changements dans un groupe simple (non répétable)
  const handleSimpleGroupFieldChange = (groupName: string, fieldName: string, value: any) => {
    setFormData(prev => {
      const currentGroup = prev[groupName] || {}
      return {
        ...prev,
        [groupName]: {
          ...currentGroup,
          [fieldName]: value
        }
      }
    })
    
    // Effacer l'erreur
    const errorKey = `${groupName}.${fieldName}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Ajouter une ligne dans un groupe répétable
  const addGroupRow = (groupName: string) => {
    setFormData(prev => {
      const currentGroup = prev[groupName] || []
      return {
        ...prev,
        [groupName]: [...currentGroup, {}]
      }
    })
  }

  // Supprimer une ligne dans un groupe répétable
  const removeGroupRow = (groupName: string, rowIndex: number) => {
    setFormData(prev => {
      const currentGroup = prev[groupName] || []
      const newGroup = currentGroup.filter((_: any, index: number) => index !== rowIndex)
      return {
        ...prev,
        [groupName]: newGroup
      }
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!selectedBonType) {
      newErrors.bonTypeId = 'Veuillez sélectionner un type de bon'
    }

    // Valider les champs simples requis
    if (selectedBonType?.formStructure?.fields) {
      selectedBonType.formStructure.fields.forEach((field: any) => {
        if (field.required) {
          const value = formData[field.name]
          // Pour les checkboxes, vérifier si c'est false (non coché)
          if (field.type === 'checkbox') {
            if (value !== true && value !== 'true' && value !== 1) {
              newErrors[field.name] = `${field.label || field.name} est requis`
            }
          } else {
            // Pour les autres types, vérifier si la valeur est vide
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              newErrors[field.name] = `${field.label || field.name} est requis`
            }
          }
        }
      })
    }

    // Valider les groupes de champs
    fieldGroups.forEach(group => {
      if (group.isRepeatable) {
        // Groupe répétable (tableau)
        const groupData = formData[group.name] || []
        const minRepeats = group.minRepeats || 0
        const maxRepeats = group.maxRepeats || Infinity
        
        // Vérifier le nombre de répétitions
        if (groupData.length < minRepeats) {
          newErrors[`${group.name}_count`] = `${group.label} : minimum ${minRepeats} ligne(s) requise(s)`
        }
        if (groupData.length > maxRepeats) {
          newErrors[`${group.name}_count`] = `${group.label} : maximum ${maxRepeats} ligne(s) autorisée(s)`
        }
        
        // Valider chaque ligne
        groupData.forEach((row: any, rowIndex: number) => {
          group.fields?.forEach(field => {
            if (field.required) {
              const value = row[field.name]
              if (field.type === 'checkbox') {
                if (value !== true && value !== 'true' && value !== 1) {
                  newErrors[`${group.name}[${rowIndex}].${field.name}`] = `${field.label} (ligne ${rowIndex + 1}) est requis`
                }
              } else {
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                  newErrors[`${group.name}[${rowIndex}].${field.name}`] = `${field.label} (ligne ${rowIndex + 1}) est requis`
                }
              }
            }
          })
        })
      } else {
        // Groupe simple (objet)
        const groupData = formData[group.name] || {}
        group.fields?.forEach(field => {
          if (field.required) {
            const value = groupData[field.name]
            if (field.type === 'checkbox') {
              if (value !== true && value !== 'true' && value !== 1) {
                newErrors[`${group.name}.${field.name}`] = `${field.label} est requis`
              }
            } else {
              if (!value || (typeof value === 'string' && value.trim() === '')) {
                newErrors[`${group.name}.${field.name}`] = `${field.label} est requis`
              }
            }
          }
        })
      }
    })

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
      
      // Structurer les valeurs : les groupes sont déjà structurés correctement
      // (groupes répétables = tableaux, groupes simples = objets)
      // Les champs simples restent au niveau racine
      const values: Record<string, any> = {}
      
      // Liste des noms de groupes pour éviter de mélanger avec les champs simples
      const groupNames = fieldGroups.map(g => g.name)
      
      // Séparer les champs simples des groupes
      Object.keys(dynamicValues).forEach(key => {
        if (groupNames.includes(key)) {
          // C'est un groupe - l'ajouter tel quel (déjà structuré correctement)
          // Pour les groupes répétables: c'est un tableau d'objets
          // Pour les groupes simples: c'est un objet
          const groupValue = dynamicValues[key]
          
          // S'assurer que les groupes répétables sont bien des tableaux
          const group = fieldGroups.find(g => g.name === key)
          if (group?.isRepeatable) {
            // Groupe répétable - doit être un tableau
            values[key] = Array.isArray(groupValue) ? groupValue : (groupValue ? [groupValue] : [])
          } else {
            // Groupe simple - doit être un objet
            values[key] = groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue) ? groupValue : {}
          }
        } else {
          // C'est un champ simple (pas dans un groupe)
          values[key] = dynamicValues[key]
        }
      })
      
      console.log('Final values to save:', JSON.stringify(values, null, 2))
      
      const bonData = {
        bonTypeId: selectedBonType.id.toString(),
        siteId: siteId || undefined,
        siteName: siteName || undefined,
        values: values,
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
        // Parser les options si c'est une string JSON
        let selectOptions: any[] = []
        if (field.options) {
          if (typeof field.options === 'string') {
            try {
              selectOptions = JSON.parse(field.options)
            } catch (e) {
              console.error('Error parsing select options:', e)
              // Si le parsing échoue, essayer de traiter comme un tableau de strings
              selectOptions = field.options.split(',').map((opt: string) => opt.trim())
            }
          } else if (Array.isArray(field.options)) {
            selectOptions = field.options
          }
        }

        // Normaliser les options : s'assurer qu'elles ont un format {value, label} ou string
        const normalizedOptions = selectOptions.map((option: any) => {
          if (typeof option === 'string') {
            return { value: option, label: option }
          } else if (typeof option === 'object' && option !== null) {
            return {
              value: option.value || option.label || option,
              label: option.label || option.value || option
            }
          }
          return { value: String(option), label: String(option) }
        })

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {normalizedOptions.length > 0 ? (
              <Select
                value={String(fieldValue || '')}
                onValueChange={(value) => handleFieldChange(field.name, value)}
              >
                <SelectTrigger className={fieldError ? 'border-destructive' : ''}>
                  <SelectValue placeholder={field.placeholder || `Sélectionnez ${field.label || field.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {normalizedOptions.map((option: any, index: number) => (
                    <SelectItem key={option.value || index} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                Aucune option configurée pour ce champ
              </div>
            )}
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

      case 'datetime':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="datetime-local"
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

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={field.name}
                checked={fieldValue === true || fieldValue === 'true' || fieldValue === 1}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor={field.name} className="cursor-pointer">
                {field.label || field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
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

  // Fonction helper pour rendre un champ dans un groupe
  const renderGroupField = (field: any, value: any, onChange: (value: any) => void, error?: string, fieldId?: string) => {
    const fieldError = error

    switch (field.type) {
      case 'text':
      case 'string':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldId || field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
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
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldId || field.name}
              type="number"
              value={value || ''}
              onChange={(e) => onChange(Number(e.target.value))}
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

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldId || field.name}
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
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

      case 'datetime':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldId || field.name}
              type="datetime-local"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
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

      case 'select':
        let selectOptions: any[] = []
        if (field.options) {
          if (typeof field.options === 'string') {
            try {
              selectOptions = JSON.parse(field.options)
            } catch (e) {
              selectOptions = field.options.split(',').map((opt: string) => opt.trim())
            }
          } else if (Array.isArray(field.options)) {
            selectOptions = field.options
          }
        }
        const normalizedOptions = selectOptions.map((option: any) => {
          if (typeof option === 'string') {
            return { value: option, label: option }
          } else if (typeof option === 'object' && option !== null) {
            return {
              value: option.value || option.label || option,
              label: option.label || option.value || option
            }
          }
          return { value: String(option), label: String(option) }
        })

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {normalizedOptions.length > 0 ? (
              <Select
                value={String(value || '')}
                onValueChange={onChange}
              >
                <SelectTrigger className={fieldError ? 'border-destructive' : ''}>
                  <SelectValue placeholder={field.placeholder || `Sélectionnez ${field.label || field.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {normalizedOptions.map((option: any, index: number) => (
                    <SelectItem key={option.value || index} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                Aucune option configurée
              </div>
            )}
            {fieldError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldError}
              </p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={fieldId || field.name}
                checked={value === true || value === 'true' || value === 1}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor={fieldId || field.name} className="cursor-pointer">
                {field.label || field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
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
            <Label htmlFor={fieldId || field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={fieldId || field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
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

  // Rendre un groupe répétable (tableau)
  const renderRepeatableGroup = (group: BonFieldGroup) => {
    const groupData = formData[group.name] || []
    const groupError = errors[`${group.name}_count`]

    return (
      <Card key={group.id} className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{group.label}</CardTitle>
              {group.description && (
                <CardDescription className="text-sm mt-1">{group.description}</CardDescription>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addGroupRow(group.name)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une ligne
            </Button>
          </div>
          {groupError && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3" />
              {groupError}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {groupData.length === 0 ? (
            <div className="space-y-4">
              {/* Afficher une ligne vide par défaut */}
              <Card className="border-border/30 bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Ligne 1</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGroupRow(group.name, 0)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.fields?.map(field => renderGroupField(
                      field,
                      undefined,
                      (value) => handleGroupFieldChange(group.name, 0, field.name, value),
                      errors[`${group.name}[0].${field.name}`],
                      `${group.name}_0_${field.name}`
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {groupData.map((row: any, rowIndex: number) => (
                <Card key={rowIndex} className="border-border/30 bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Ligne {rowIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroupRow(group.name, rowIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.fields?.map(field => renderGroupField(
                        field,
                        row[field.name],
                        (value) => handleGroupFieldChange(group.name, rowIndex, field.name, value),
                        errors[`${group.name}[${rowIndex}].${field.name}`],
                        `${group.name}_${rowIndex}_${field.name}`
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Rendre un groupe simple (non répétable)
  const renderSimpleGroup = (group: BonFieldGroup) => {
    const groupData = formData[group.name] || {}

    return (
      <Card key={group.id} className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{group.label}</CardTitle>
          {group.description && (
            <CardDescription className="text-sm mt-1">{group.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.fields?.map(field => renderGroupField(
              field,
              groupData[field.name],
              (value) => handleSimpleGroupFieldChange(group.name, field.name, value),
              errors[`${group.name}.${field.name}`],
              `${group.name}_${field.name}`
            ))}
          </div>
        </CardContent>
      </Card>
    )
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
                        {type.name}
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
          {selectedBonType && (
            <>
              {/* Champs simples (sans groupe) */}
              {selectedBonType.formStructure?.fields && selectedBonType.formStructure.fields.length > 0 && (
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

              {/* Groupes de champs */}
              {fieldGroups.length > 0 && (
                <div className="mt-6 space-y-6">
                  {fieldGroups
                    .sort((a, b) => a.order - b.order)
                    .map(group => 
                      group.isRepeatable 
                        ? renderRepeatableGroup(group)
                        : renderSimpleGroup(group)
                    )}
                </div>
              )}

              {/* Message si aucun champ ni groupe n'est disponible */}
              {selectedBonType && 
               (!selectedBonType.formStructure?.fields || selectedBonType.formStructure.fields.length === 0) && 
               fieldGroups.length === 0 && (
                <Card className="border-border/50 mt-6">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                      Aucun champ configuré pour ce type de bon. Veuillez configurer les champs dans les paramètres du type de bon.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
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

