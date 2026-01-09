'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { PDFTemplate, PDFTemplateSection, DocumentType, DocumentField } from '@/lib/api'
// import { ElementsPalette } from './elements-palette' // TODO: Create elements-palette component
import { CanvasArea } from './canvas-area'
// import { PropertiesPanel } from './properties-palette' // TODO: Create properties-panel component
// import { TableEditor } from './table-editor' // TODO: Create table-editor component
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, X } from 'lucide-react'

interface VisualPDFEditorV2Props {
  template: PDFTemplate
  onTemplateChange: (template: PDFTemplate) => void
  documentType?: DocumentType | null
  availableFields?: DocumentField[]
}

export function VisualPDFEditorV2({ 
  template, 
  onTemplateChange,
  documentType,
  availableFields = []
}: VisualPDFEditorV2Props) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const selectedSection = template.sections?.find(s => s.id === selectedSectionId) || null


  const handleAddSection = useCallback((type: string, position?: { x: number; y: number }) => {
    const newSection: PDFTemplateSection = {
      id: `section-${Date.now()}`,
      type: type as any,
      position: position || { 
        x: 10, 
        y: template.sections?.length ? template.sections.length * 15 : 10,
        width: type === 'table' ? 80 : type === 'spacer' ? 100 : 50,
        height: type === 'spacer' ? 20 : undefined
      },
      content: type === 'text' ? '' : type === 'header' ? 'Nouveau titre' : undefined,
      style: {
        fontSize: type === 'header' ? 18 : 12,
        fontWeight: type === 'header' ? 'bold' : 'normal',
        alignment: 'left',
      },
    }

    if (type === 'company_header') {
      newSection.companyHeaderConfig = {
        showLogo: true,
        logoPosition: 'left',
        showCompanyName: true,
        showCompanyAddress: true,
        showCompanyContact: true,
        layout: 'horizontal',
      }
    }

    if (type === 'table') {
      // Initialiser avec des colonnes par défaut basées sur les champs disponibles
      newSection.content = {
        columns: availableFields.slice(0, 3).map((field, index) => ({
          id: `col-${index}`,
          header: field.label,
          fieldName: field.name,
          width: 33,
          alignment: 'left' as const,
        })),
      }
    }

    const updatedTemplate: PDFTemplate = {
      ...template,
      sections: [...(template.sections || []), newSection],
    }

    onTemplateChange(updatedTemplate)
    setSelectedSectionId(newSection.id)
  }, [template, onTemplateChange, availableFields])

  const handleUpdateSection = useCallback((updates: Partial<PDFTemplateSection>) => {
    if (!selectedSectionId) return

    const updatedSections = template.sections?.map(section =>
      section.id === selectedSectionId
        ? { ...section, ...updates }
        : section
    ) || []

    const updatedTemplate: PDFTemplate = {
      ...template,
      sections: updatedSections,
    }

    onTemplateChange(updatedTemplate)
  }, [selectedSectionId, template, onTemplateChange])

  const handleDeleteSection = useCallback((sectionId: string) => {
    const updatedSections = template.sections?.filter(s => s.id !== sectionId) || []
    const updatedTemplate: PDFTemplate = {
      ...template,
      sections: updatedSections,
    }
    onTemplateChange(updatedTemplate)
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null)
    }
  }, [template, onTemplateChange, selectedSectionId])


  const editorContent = (
    <DndProvider backend={HTML5Backend}>
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : 'flex flex-col h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background'}>
        {/* Header avec bouton plein écran */}
        <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {documentType?.name || 'Template PDF'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {template.sections?.length || 0} section(s) • {documentType?.code || 'N/A'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Palette d'éléments en haut */}
        {/* <div className="border-b bg-muted/20 px-4 py-3">
          <ElementsPalette onElementAdd={(type: string) => handleAddSection(type)} />
        </div> */}

        {/* Zone principale */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas central */}
          <div className="flex-1 p-6 overflow-auto bg-muted/10">
            <CanvasArea
              sections={template.sections || []}
              onSectionAdd={handleAddSection}
              onSectionSelect={setSelectedSectionId}
              selectedSectionId={selectedSectionId}
              className="h-full min-h-[600px]"
            />
          </div>

          {/* Panneau de propriétés */}
          {/* <PropertiesPanel
            selectedSection={selectedSection}
            onUpdate={handleUpdateSection}
            onDelete={selectedSectionId ? () => handleDeleteSection(selectedSectionId) : undefined}
            availableFields={availableFields}
          /> */}
        </div>
      </div>
    </DndProvider>
  )

  return editorContent
}

