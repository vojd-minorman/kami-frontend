'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Edit, Trash2, Eye, Loader2, CheckCircle2, XCircle, Link as LinkIcon, Check } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { api, type DocumentType, type PDFTemplateModel } from '@/lib/api'
import { DashboardShell } from '@/components/dashboard-shell'

export default function TemplatesListPage() {
  const router = useRouter()
  const params = useParams()
  const documentTypeId = params?.documentTypeId as string
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  
  const [loading, setLoading] = useState(true)
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [templates, setTemplates] = useState<PDFTemplateModel[]>([])
  const [defaultTemplates, setDefaultTemplates] = useState<PDFTemplateModel[]>([])
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState<string>('')
  const [linkActivate, setLinkActivate] = useState(true)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (user && documentTypeId) {
      loadData()
    }
  }, [user, documentTypeId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [docType, templatesData, defaultTemplatesData] = await Promise.all([
        api.getDocumentType(documentTypeId),
        api.getTemplates(documentTypeId),
        api.getDefaultTemplates(),
      ])
      setDocumentType(docType)
      setTemplates(templatesData)
      setDefaultTemplates(defaultTemplatesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (templateId: string) => {
    try {
      setActivating(templateId)
      await api.activateTemplate(documentTypeId, templateId)
      await loadData()
    } catch (error: any) {
      console.error('Error activating template:', error)
      alert(error.message || 'Erreur lors de l\'activation du template')
    } finally {
      setActivating(null)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting(templateId)
      await api.deleteTemplate(documentTypeId, templateId)
      await loadData()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      alert(error.message || 'Erreur lors de la suppression du template')
    } finally {
      setDeleting(null)
    }
  }

  const handleLinkTemplate = async () => {
    if (!selectedDefaultTemplate) {
      alert('Veuillez sélectionner un template')
      return
    }

    try {
      setLinking(true)
      await api.linkTemplate(documentTypeId, selectedDefaultTemplate, linkActivate)
      setShowLinkDialog(false)
      setSelectedDefaultTemplate('')
      await loadData()
    } catch (error: any) {
      console.error('Error linking template:', error)
      alert(error.message || 'Erreur lors de la liaison du template')
    } finally {
      setLinking(false)
    }
  }

  const getStatusBadge = (isActive: boolean, isDefault: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Actif
        </Badge>
      )
    }
    if (isDefault) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          Par défaut
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="h-3 w-3 mr-1" />
        Inactif
      </Badge>
    )
  }

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
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
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
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Templates PDF - {documentType?.name}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les templates PDF pour ce type de document
            </p>
          </div>
          {hasPermission('template.create') && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowLinkDialog(true)}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Lier un template
              </Button>
              <Link href={`/dashboard/templates/${documentTypeId}/edit`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un template
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Templates List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Liste des templates</CardTitle>
            <CardDescription className="text-sm">
              {templates.length > 0 
                ? `${templates.length} template(s) disponible(s)` 
                : 'Aucun template défini'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucun template défini pour ce type de document
                </p>
                {hasPermission('template.create') && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowLinkDialog(true)}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Lier un template par défaut
                    </Button>
                    <Link href={`/dashboard/templates/${documentTypeId}/edit`}>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un nouveau template
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {template.description || 'Aucune description'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(template.isActive, template.isDefault)}
                        </TableCell>
                        <TableCell>
                          {template.isDefault ? (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                              Template système
                            </Badge>
                          ) : (
                            <Badge variant="outline">Template personnalisé</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!template.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivate(template.id)}
                                disabled={activating === template.id}
                                title="Activer ce template"
                              >
                                {activating === template.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Link href={`/dashboard/templates/${documentTypeId}/edit?templateId=${template.id}`}>
                              <Button variant="ghost" size="sm" title="Modifier">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            {!template.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(template.id)}
                                disabled={deleting === template.id}
                                title="Supprimer"
                              >
                                {deleting === template.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
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

      {/* Dialog pour lier un template */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lier un template par défaut</DialogTitle>
            <DialogDescription>
              Sélectionnez un template par défaut du système à lier à ce type de document.
              Le template sera copié et pourra être modifié indépendamment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="default-template" className="text-sm font-medium">
                Template par défaut
              </label>
              {defaultTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun template par défaut disponible
                </p>
              ) : (
                <Select
                  value={selectedDefaultTemplate}
                  onValueChange={setSelectedDefaultTemplate}
                >
                  <SelectTrigger id="default-template">
                    <SelectValue placeholder="Sélectionner un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.description && `- ${template.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="link-activate"
                  checked={linkActivate}
                  onChange={(e) => setLinkActivate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="link-activate" className="text-sm cursor-pointer">
                  Activer ce template après la liaison
                </label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Si coché, ce template sera automatiquement activé (et les autres désactivés)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false)
                setSelectedDefaultTemplate('')
              }}
              disabled={linking}
            >
              Annuler
            </Button>
            <Button
              onClick={handleLinkTemplate}
              disabled={!selectedDefaultTemplate || linking}
            >
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Liaison en cours...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Lier le template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
