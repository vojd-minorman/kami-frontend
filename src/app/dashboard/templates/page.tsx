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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Eye, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { api, type DocumentType, type PDFTemplate } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { PermissionGuard } from '@/components/permission-guard'
import { DashboardShell } from '@/components/dashboard-shell'

interface TemplateInfo {
  documentType: DocumentType
  hasTemplate: boolean
  template?: PDFTemplate
}

export default function TemplatesPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadTemplates()
    }
  }, [user])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const documentTypes = await api.getDocumentTypes()
      
      // Pour chaque type de document, vérifier s'il a un template (en parallèle mais avec gestion d'erreur)
      const templatesInfo: TemplateInfo[] = await Promise.allSettled(
        documentTypes.map(async (documentType) => {
          try {
            const template = await api.getTemplate(documentType.id)
            return {
              documentType,
              hasTemplate: true,
              template,
            }
          } catch (error: any) {
            // Si le template n'existe pas, on retourne hasTemplate: false
            return {
              documentType,
              hasTemplate: false,
            }
          }
        })
      ).then(results => 
        results.map(result => 
          result.status === 'fulfilled' ? result.value : {
            documentType: documentTypes[results.indexOf(result)],
            hasTemplate: false,
          }
        )
      )
      
      setTemplates(templatesInfo)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTemplateStatusBadge = (hasTemplate: boolean) => {
    if (hasTemplate) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Template actif
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="h-3 w-3 mr-1" />
        Aucun template
      </Badge>
    )
  }

  return (
    <PermissionGuard permission="template.read">
      <DashboardShell>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.templates.title || 'Templates PDF'}</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gérez les templates PDF pour chaque type de document
            </p>
          </div>
          <Link href="/dashboard/templates/create">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t.templates.create || 'Créer un template'}
            </Button>
          </Link>
        </div>

        {/* Templates List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Liste des templates PDF</CardTitle>
            <CardDescription className="text-sm">
              {templates.length > 0 
                ? `${templates.length} type(s) de document trouvé(s)` 
                : 'Aucun type de document'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  Aucun type de document trouvé
                </p>
                <Link href="/dashboard/templates/create">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer votre premier template
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Type de document</TableHead>
                      <TableHead className="min-w-[100px]">Code</TableHead>
                      <TableHead className="min-w-[150px]">Statut du template</TableHead>
                      <TableHead className="min-w-[200px]">Informations</TableHead>
                      <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((templateInfo) => (
                      <TableRow key={templateInfo.documentType.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{templateInfo.documentType.name}</span>
                            {templateInfo.documentType.description && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {templateInfo.documentType.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {templateInfo.documentType.code}
                        </TableCell>
                        <TableCell>
                          {getTemplateStatusBadge(templateInfo.hasTemplate)}
                        </TableCell>
                        <TableCell>
                          {templateInfo.hasTemplate && templateInfo.template ? (
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span>Taille:</span>
                                <span className="font-medium">{templateInfo.template.layout?.pageSize || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Orientation:</span>
                                <span className="font-medium capitalize">
                                  {templateInfo.template.layout?.orientation || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Aucune information disponible
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(!templateInfo.documentType.fields || templateInfo.documentType.fields.length === 0) ? (
                              <Link href={`/dashboard/document-types/${templateInfo.documentType.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Configurer les champs
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/dashboard/templates/${templateInfo.documentType.id}/edit`}>
                                <Button 
                                  variant={templateInfo.hasTemplate ? "default" : "outline"} 
                                  size="sm"
                                >
                                  {templateInfo.hasTemplate ? (
                                    <>
                                      <Edit className="h-4 w-4 mr-1" />
                                      Modifier
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Créer
                                    </>
                                  )}
                                </Button>
                              </Link>
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
      </DashboardShell>
    </PermissionGuard>
  )
}
