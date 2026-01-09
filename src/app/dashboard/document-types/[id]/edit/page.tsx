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
import { api, type DocumentType, type DocumentField, type DocumentFieldGroup, type Category } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function EditDocumentTypePage() {
  const router = useRouter()
  const params = useParams()
  const documentTypeId = params?.id as string
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [fields, setFields] = useState<DocumentField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [fieldGroups, setFieldGroups] = useState<DocumentFieldGroup[]>([])
  const [loadingFieldGroups, setLoadingFieldGroups] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [allDocumentTypes, setAllDocumentTypes] = useState<DocumentType[]>([])
  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    categoryId: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Dialog pour créer/modifier un champ
  const [showFieldDialog, setShowFieldDialog] = useState(false)
  const [editingField, setEditingField] = useState<DocumentField | null>(null)
  const [fieldFormData, setFieldFormData] = useState({
    name: '',
    label: '',
    type: 'text' as DocumentField['type'],
    required: false,
    options: '',
    validationRules: '',
    documentFieldGroupId: null as string | null,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [savingField, setSavingField] = useState(false)
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)

  // Dialog pour créer/modifier un groupe
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DocumentFieldGroup | null>(null)
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    label: '',
    description: '',
    isRepeatable: false,
    minRepeats: null as number | null,
    maxRepeats: null as number | null,
    order: 0,
  })
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({})
  const [savingGroup, setSavingGroup] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (user && documentTypeId) {
      loadDocumentType()
      loadFields()
      loadFieldGroups()
      loadCategories()
      loadAllDocumentTypes()
    }
  }, [user, documentTypeId])

  const loadDocumentType = async () => {
    try {
      setLoading(true)
      const data = await api.getDocumentType(documentTypeId)
      setDocumentType(data)
      setFormData({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        categoryId: data.categoryId || '',
        status: data.status || 'active',
      })
    } catch (error: any) {
      console.error('Error loading document type:', error)
      alert(error.message || 'Erreur lors du chargement du type de document')
      router.push('/dashboard/document-types')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    try {
      setLoadingFields(true)
      const fieldsData = await api.getDocumentFields(documentTypeId)
      setFields(fieldsData)
    } catch (error: any) {
      console.error('Error loading fields:', error)
    } finally {
      setLoadingFields(false)
    }
  }

  const loadFieldGroups = async () => {
    try {
      setLoadingFieldGroups(true)
      const groupsData = await api.getDocumentFieldGroups(documentTypeId)
      setFieldGroups(groupsData)
    } catch (error: any) {
      console.error('Error loading field groups:', error)
    } finally {
      setLoadingFieldGroups(false)
    }
  }

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const cats = await api.getCategories({ status: 'active' })
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadAllDocumentTypes = async () => {
    try {
      setLoadingDocumentTypes(true)
      const types = await api.getDocumentTypes()
      setAllDocumentTypes(types)
    } catch (error) {
      console.error('Error loading document types:', error)
    } finally {
      setLoadingDocumentTypes(false)
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
    
    if (!validateForm() || !documentType) {
      return
    }

    try {
      setSaving(true)
      
      const documentTypeData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId || null,
        status: formData.status,
      }

      await api.updateDocumentType(documentTypeId, documentTypeData)
      
      // Rediriger vers la liste des types de documents
      router.push('/dashboard/document-types')
    } catch (error: any) {
      console.error('Error updating document type:', error)
      // Gérer spécifiquement l'erreur de code dupliqué
      if (error.message?.includes('existe déjà') || error.message?.includes('DUPLICATE_CODE')) {
        setErrors({ code: 'Ce code est déjà utilisé par un autre type de document' })
      } else {
        alert(error.message || 'Erreur lors de la mise à jour du type de document')
      }
      setSaving(false)
    }
  }

  // Gestion des champs
  const openFieldDialog = (field?: DocumentField) => {
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
        documentFieldGroupId: field.documentFieldGroupId || null,
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
        documentFieldGroupId: null,
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
        documentFieldGroupId: fieldFormData.documentFieldGroupId && fieldFormData.documentFieldGroupId !== 'none' ? fieldFormData.documentFieldGroupId : null,
      }
      
      console.log('[handleSaveField] Field data to send:', JSON.stringify(fieldData, null, 2))
      console.log('[handleSaveField] documentFieldGroupId from form:', fieldFormData.documentFieldGroupId)

      // Parser les options et validationRules si fournis
      if (fieldFormData.options.trim()) {
        fieldData.options = JSON.parse(fieldFormData.options)
      }
      if (fieldFormData.validationRules.trim()) {
        fieldData.validationRules = JSON.parse(fieldFormData.validationRules)
      }

      if (editingField) {
        await api.updateDocumentField(documentTypeId, editingField.id, fieldData)
      } else {
        await api.createDocumentField(documentTypeId, fieldData)
      }

      setShowFieldDialog(false)
      await loadFields()
      await loadFieldGroups() // Recharger les groupes pour afficher les champs mis à jour
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
      await api.deleteDocumentField(documentTypeId, fieldId)
      await loadFields()
      await loadFieldGroups() // Recharger les groupes car ils peuvent contenir ce champ
    } catch (error: any) {
      console.error('Error deleting field:', error)
      alert(error.message || 'Erreur lors de la suppression du champ')
    } finally {
      setDeletingFieldId(null)
    }
  }

  // Gestion des groupes
  const openGroupDialog = (group?: DocumentFieldGroup) => {
    if (group) {
      setEditingGroup(group)
      setGroupFormData({
        name: group.name,
        label: group.label,
        description: group.description || '',
        isRepeatable: group.isRepeatable,
        minRepeats: group.minRepeats || null,
        maxRepeats: group.maxRepeats || null,
        order: group.order,
      })
    } else {
      setEditingGroup(null)
      setGroupFormData({
        name: '',
        label: '',
        description: '',
        isRepeatable: false,
        minRepeats: null,
        maxRepeats: null,
        order: fieldGroups.length,
      })
    }
    setGroupErrors({})
    setShowGroupDialog(true)
  }

  const validateGroupForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!groupFormData.name.trim()) {
      newErrors.name = 'Le nom est requis'
    } else if (!/^[a-z][a-z0-9_]*$/.test(groupFormData.name)) {
      newErrors.name = 'Le nom doit commencer par une lettre et ne contenir que des lettres minuscules, chiffres et underscores'
    }
    
    if (!groupFormData.label.trim()) {
      newErrors.label = 'Le label est requis'
    }

    // Vérifier l'unicité du nom
    const existingGroup = fieldGroups.find(g => 
      g.name === groupFormData.name && (!editingGroup || g.id !== editingGroup.id)
    )
    if (existingGroup) {
      newErrors.name = 'Un groupe avec ce nom existe déjà'
    }

    // Valider minRepeats et maxRepeats si isRepeatable est true
    if (groupFormData.isRepeatable) {
      if (groupFormData.minRepeats !== null && groupFormData.minRepeats < 0) {
        newErrors.minRepeats = 'minRepeats doit être >= 0'
      }
      if (groupFormData.maxRepeats !== null && groupFormData.maxRepeats < 1) {
        newErrors.maxRepeats = 'maxRepeats doit être >= 1'
      }
      if (groupFormData.minRepeats !== null && groupFormData.maxRepeats !== null && groupFormData.minRepeats > groupFormData.maxRepeats) {
        newErrors.maxRepeats = 'maxRepeats doit être >= minRepeats'
      }
    }

    setGroupErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveGroup = async () => {
    if (!validateGroupForm()) {
      return
    }

    try {
      setSavingGroup(true)

      const groupData: any = {
        name: groupFormData.name.trim(),
        label: groupFormData.label.trim(),
        description: groupFormData.description.trim() || null,
        isRepeatable: groupFormData.isRepeatable,
        order: groupFormData.order,
      }

      if (groupFormData.isRepeatable) {
        groupData.minRepeats = groupFormData.minRepeats
        groupData.maxRepeats = groupFormData.maxRepeats
      }

      if (editingGroup) {
        await api.updateDocumentFieldGroup(documentTypeId, editingGroup.id, groupData)
      } else {
        await api.createDocumentFieldGroup(documentTypeId, groupData)
      }

      setShowGroupDialog(false)
      await loadFieldGroups()
    } catch (error: any) {
      console.error('Error saving group:', error)
      alert(error.message || 'Erreur lors de la sauvegarde du groupe')
    } finally {
      setSavingGroup(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible et supprimera également tous les champs associés.')) {
      return
    }

    try {
      setDeletingGroupId(groupId)
      await api.deleteDocumentFieldGroup(documentTypeId, groupId)
      await loadFieldGroups()
      await loadFields() // Recharger les champs car certains peuvent avoir été supprimés
    } catch (error: any) {
      console.error('Error deleting group:', error)
      alert(error.message || 'Erreur lors de la suppression du groupe')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const getTypeBadge = (type: DocumentField['type']) => {
    const colors: Record<DocumentField['type'], string> = {
      text: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      number: 'bg-green-500/10 text-green-500 border-green-500/20',
      date: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      datetime: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      select: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      checkbox: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      textarea: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      file: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      document_link: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
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
          <Link href="/dashboard/document-types">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Modifier le type de document</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              {documentType?.name || 'Chargement...'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Informations générales</CardTitle>
              <CardDescription className="text-sm">
                Modifiez les informations du type de document
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
                  placeholder="Ex: Document de livraison"
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
                  placeholder="Description du type de document..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Catégorie</Label>
                {loadingCategories ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.categoryId || 'none'}
                    onValueChange={(value) => handleChange('categoryId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Sélectionner une catégorie (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune catégorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  La catégorie permet d'organiser les types de documents et de gérer les permissions par groupe
                </p>
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

              {/* Section Champs de liaison */}
              {fields.filter(f => f.type === 'document_link').length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Champs de liaison configurés</Label>
                  <div className="space-y-2">
                    {fields
                      .filter(f => f.type === 'document_link')
                      .map((field) => {
                        let linkConfig: any = {}
                        try {
                          linkConfig = field.options ? JSON.parse(field.options) : {}
                        } catch {}
                        
                        const targetType = allDocumentTypes.find(dt => dt.id === linkConfig.targetDocumentTypeId)
                        
                        return (
                          <div key={field.id} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{field.label || field.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {targetType ? (
                                    <>Liaison vers: <strong>{targetType.name}</strong> ({targetType.code})</>
                                  ) : (
                                    <>Liaison vers: <strong>Tous les types</strong></>
                                  )}
                                </div>
                                {linkConfig.linkType && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Type: {linkConfig.linkType}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openFieldDialog(field)}
                                className="h-8"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Modifier
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pour ajouter un nouveau champ de liaison, utilisez le bouton "Ajouter un champ" dans la section "Champs du formulaire" ci-dessous.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Groupes de champs */}
          <Card className="border-border/50 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">Groupes de champs</CardTitle>
                  <CardDescription className="text-sm">
                    Créez des groupes de champs répétables (tableaux) ou des groupes simples
                  </CardDescription>
                </div>
                <Button type="button" onClick={() => openGroupDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un groupe
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFieldGroups ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : fieldGroups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Aucun groupe défini. Créez un groupe pour regrouper des champs (ex: lignes de facture).
                  </p>
                  <Button type="button" variant="outline" onClick={() => openGroupDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter le premier groupe
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldGroups.map((group) => (
                    <Card key={group.id} className="border-border/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{group.label}</CardTitle>
                              <Badge variant="outline" className={group.isRepeatable ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}>
                                {group.isRepeatable ? 'Répétable' : 'Simple'}
                              </Badge>
                            </div>
                            <CardDescription className="text-sm">
                              {group.description || `Groupe: ${group.name}`}
                              {group.isRepeatable && (
                                <span className="ml-2">
                                  ({group.minRepeats !== null ? `min: ${group.minRepeats}` : ''} 
                                  {group.minRepeats !== null && group.maxRepeats !== null ? ', ' : ''}
                                  {group.maxRepeats !== null ? `max: ${group.maxRepeats}` : ''})
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openGroupDialog(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={deletingGroupId === group.id}
                            >
                              {deletingGroupId === group.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {group.fields && group.fields.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Champs du groupe:</p>
                            <div className="flex flex-wrap gap-2">
                              {group.fields.map((field) => (
                                <Badge key={field.id} variant="outline">
                                  {field.label} ({field.name})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Aucun champ dans ce groupe. Ajoutez des champs à ce groupe lors de leur création.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Champs */}
          <Card className="border-border/50 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">Champs du formulaire</CardTitle>
                  <CardDescription className="text-sm">
                    Définissez les champs qui composeront le formulaire de création de documents
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
                        <TableHead>Groupe</TableHead>
                        <TableHead>Requis</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field) => {
                        const group = field.documentFieldGroupId ? fieldGroups.find(g => g.id === field.documentFieldGroupId) : null
                        return (
                        <TableRow key={field.id}>
                          <TableCell className="font-mono text-sm">{field.order}</TableCell>
                          <TableCell className="font-mono text-sm">{field.name}</TableCell>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>{getTypeBadge(field.type)}</TableCell>
                          <TableCell>
                            {group ? (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                {group.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
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
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
            <Link href="/dashboard/document-types">
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
                  onValueChange={(value: DocumentField['type']) => {
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
                    <SelectItem value="textarea">Zone de texte</SelectItem>
                    <SelectItem value="file">Fichier</SelectItem>
                    <SelectItem value="document_link">Liaison de document</SelectItem>
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

            {fieldFormData.type === 'document_link' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="field-link-target-type">
                    Type de document cible <span className="text-destructive">*</span>
                  </Label>
                  {loadingDocumentTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={(() => {
                        try {
                          const opts = fieldFormData.options ? JSON.parse(fieldFormData.options) : {}
                          return opts.targetDocumentTypeId || 'none'
                        } catch {
                          return 'none'
                        }
                      })()}
                      onValueChange={(value) => {
                        try {
                          const currentOpts = fieldFormData.options ? JSON.parse(fieldFormData.options) : {}
                          const newOpts = { ...currentOpts, targetDocumentTypeId: value === 'none' ? undefined : value }
                          setFieldFormData(prev => ({ ...prev, options: JSON.stringify(newOpts) }))
                        } catch (e) {
                          console.error('Error parsing options:', e)
                        }
                      }}
                    >
                      <SelectTrigger id="field-link-target-type">
                        <SelectValue placeholder="Sélectionner un type de document" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun (tous les types)</SelectItem>
                        {allDocumentTypes
                          .filter((dt: DocumentType) => dt.id !== documentTypeId)
                          .map((dt: DocumentType) => (
                            <SelectItem key={dt.id} value={dt.id}>
                              {dt.name} ({dt.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-link-type">
                    Type de liaison
                  </Label>
                  <Select
                    value={(() => {
                      try {
                        const opts = fieldFormData.options ? JSON.parse(fieldFormData.options) : {}
                        return opts.linkType || 'reference'
                      } catch {
                        return 'reference'
                      }
                    })()}
                    onValueChange={(value) => {
                      try {
                        const currentOpts = fieldFormData.options ? JSON.parse(fieldFormData.options) : {}
                        const newOpts = { ...currentOpts, linkType: value }
                        setFieldFormData(prev => ({ ...prev, options: JSON.stringify(newOpts) }))
                      } catch (e) {
                        console.error('Error parsing options:', e)
                      }
                    }}
                  >
                    <SelectTrigger id="field-link-type">
                      <SelectValue placeholder="Type de liaison" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reference">Référence</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Enfant</SelectItem>
                      <SelectItem value="authorization">Autorisation</SelectItem>
                      <SelectItem value="entry">Entrée</SelectItem>
                      <SelectItem value="exit">Sortie</SelectItem>
                      <SelectItem value="continuation">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Définit le type de relation entre les documents
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="field-group">
                Groupe (optionnel)
              </Label>
              <Select
                value={fieldFormData.documentFieldGroupId || 'none'}
                onValueChange={(value) => setFieldFormData(prev => ({ ...prev, documentFieldGroupId: value === 'none' ? null : value }))}
              >
                <SelectTrigger id="field-group">
                  <SelectValue placeholder="Aucun groupe (champ simple)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun groupe (champ simple)</SelectItem>
                  {fieldGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label} {group.isRepeatable && '(Répétable)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sélectionnez un groupe pour regrouper ce champ avec d'autres
              </p>
            </div>

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

      {/* Dialog pour créer/modifier un groupe */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Modifier le groupe' : 'Créer un nouveau groupe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">
                  Nom (technique) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="group-name"
                  value={groupFormData.name}
                  onChange={(e) => {
                    setGroupFormData(prev => ({ ...prev, name: e.target.value }))
                    if (groupErrors.name) {
                      setGroupErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.name
                        return newErrors
                      })
                    }
                  }}
                  placeholder="ex: invoice_line"
                  className={groupErrors.name ? 'border-destructive' : ''}
                  disabled={!!editingGroup}
                />
                {groupErrors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {groupErrors.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Identifiant unique (lettres minuscules, chiffres, underscores)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-label">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="group-label"
                  value={groupFormData.label}
                  onChange={(e) => {
                    setGroupFormData(prev => ({ ...prev, label: e.target.value }))
                    if (groupErrors.label) {
                      setGroupErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.label
                        return newErrors
                      })
                    }
                  }}
                  placeholder="Ex: Ligne de facture"
                  className={groupErrors.label ? 'border-destructive' : ''}
                />
                {groupErrors.label && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {groupErrors.label}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Texte affiché dans le formulaire
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={groupFormData.description}
                onChange={(e) => setGroupFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du groupe..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="group-repeatable"
                  checked={groupFormData.isRepeatable}
                  onChange={(e) => setGroupFormData(prev => ({ ...prev, isRepeatable: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="group-repeatable" className="cursor-pointer">
                  Groupe répétable (tableau)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Si coché, ce groupe peut être répété plusieurs fois (ex: lignes de facture)
              </p>
            </div>

            {groupFormData.isRepeatable && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="group-min-repeats">
                    Nombre minimum de répétitions
                  </Label>
                  <Input
                    id="group-min-repeats"
                    type="number"
                    min="0"
                    value={groupFormData.minRepeats || ''}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, minRepeats: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Ex: 1"
                    className={groupErrors.minRepeats ? 'border-destructive' : ''}
                  />
                  {groupErrors.minRepeats && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {groupErrors.minRepeats}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-max-repeats">
                    Nombre maximum de répétitions
                  </Label>
                  <Input
                    id="group-max-repeats"
                    type="number"
                    min="1"
                    value={groupFormData.maxRepeats || ''}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, maxRepeats: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Ex: 100"
                    className={groupErrors.maxRepeats ? 'border-destructive' : ''}
                  />
                  {groupErrors.maxRepeats && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {groupErrors.maxRepeats}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGroupDialog(false)}
              disabled={savingGroup}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveGroup}
              disabled={savingGroup}
            >
              {savingGroup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingGroup ? 'Modifier' : 'Créer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
