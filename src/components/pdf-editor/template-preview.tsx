'use client'

import { PDFTemplate } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Building2, 
  Table, 
  Image as ImageIcon, 
  QrCode, 
  PenTool,
  Minus
} from 'lucide-react'

interface TemplatePreviewProps {
  template: PDFTemplate
  onSectionSelect?: (sectionId: string) => void
  selectedSectionId?: string | null
}

export function TemplatePreview({ 
  template, 
  onSectionSelect,
  selectedSectionId 
}: TemplatePreviewProps) {
  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />
      case 'header': return <FileText className="h-4 w-4" />
      case 'company_header': return <Building2 className="h-4 w-4" />
      case 'table': return <Table className="h-4 w-4" />
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'qr_code': return <QrCode className="h-4 w-4" />
      case 'signature': return <PenTool className="h-4 w-4" />
      case 'spacer': return <Minus className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getSectionLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Texte',
      header: 'Titre',
      company_header: 'En-tête Entreprise',
      table: 'Tableau',
      image: 'Image',
      qr_code: 'Code QR',
      signature: 'Signature',
      footer: 'Pied de page',
      spacer: 'Espacement',
    }
    return labels[type] || type
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Aperçu du Template</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Informations du template */}
          <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taille:</span>
              <span className="font-medium">{template.pageSize || 'A4'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orientation:</span>
              <span className="font-medium capitalize">
                {template.orientation || 'portrait'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sections:</span>
              <span className="font-medium">{template.sections?.length || 0}</span>
            </div>
          </div>

          {/* Liste des sections */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {template.sections && template.sections.length > 0 ? (
              template.sections.map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => onSectionSelect?.(section.id)}
                  className={`
                    p-2 rounded border cursor-pointer transition-colors
                    ${selectedSectionId === section.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-background hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {getSectionIcon(section.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getSectionLabel(section.type)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {section.dataBinding && (
                          <Badge variant="secondary" className="text-xs">
                            {section.dataBinding}
                          </Badge>
                        )}
                      </div>
                      {section.content && typeof section.content === 'string' && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {section.content.substring(0, 50)}
                          {section.content.length > 50 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>Aucune section dans ce template</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}








