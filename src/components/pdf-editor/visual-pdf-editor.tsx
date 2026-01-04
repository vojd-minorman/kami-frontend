'use client'

import { useState, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { PDFTemplate, PDFTemplateSection } from '@/lib/api'
import { ElementsPalette } from './elements-palette'
import { EditorContentArea } from './editor-content'
import { PropertiesPanel } from './properties-panel'
import { TemplatePreview } from './template-preview'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Code, Settings } from 'lucide-react'

interface VisualPDFEditorProps {
  template: PDFTemplate
  onTemplateChange: (template: PDFTemplate) => void
  bonTypeName?: string
}

export function VisualPDFEditor({ 
  template, 
  onTemplateChange,
  bonTypeName 
}: VisualPDFEditorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual')
  const [editorContent, setEditorContent] = useState('')

  const selectedSection = template.sections?.find(s => s.id === selectedSectionId) || null

  const handleAddSection = useCallback((type: string) => {
    const newSection: PDFTemplateSection = {
      id: `section-${Date.now()}`,
      type: type as any,
      position: { 
        x: 0, 
        y: template.sections?.length ? template.sections.length * 50 : 0,
        width: 100,
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

    const updatedTemplate: PDFTemplate = {
      ...template,
      sections: [...(template.sections || []), newSection],
    }

    onTemplateChange(updatedTemplate)
    setSelectedSectionId(newSection.id)
  }, [template, onTemplateChange])

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

  // Transformer le contenu HTML de l'éditeur en sections
  const handleEditorContentChange = useCallback((html: string) => {
    setEditorContent(html)
    // Ici, on pourrait parser le HTML et créer des sections automatiquement
    // Pour l'instant, on garde juste le contenu
  }, [])

  // Convertir les sections en HTML pour l'éditeur
  const getEditorContentFromSections = useCallback(() => {
    if (!template.sections || template.sections.length === 0) {
      return '<p>Commencez à créer votre template...</p>'
    }

    return template.sections
      .filter(s => s.type === 'text' || s.type === 'header')
      .map(section => {
        const tag = section.type === 'header' ? 'h2' : 'p'
        const content = section.content || ''
        const sectionStyle = section.style
          ? `style="font-size: ${section.style.fontSize || 12}px; text-align: ${section.style.alignment || 'left'}; color: ${section.style.color || '#000'};"`
          : ''
        return `<${tag} ${sectionStyle}>${content}</${tag}>`
      })
      .join('')
  }, [template.sections])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background">
        {/* Palette d'éléments */}
        <ElementsPalette onElementAdd={handleAddSection} />

        {/* Zone principale */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList>
                <TabsTrigger value="visual" className="gap-2">
                  <Code className="h-4 w-4" />
                  Éditeur Visuel
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Code Template
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Contenu de l'éditeur visuel */}
            <TabsContent value="visual" className="flex-1 m-0 p-4 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-1">
                      {bonTypeName || 'Template PDF'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Créez votre template en glissant-déposant des éléments ou en utilisant l'éditeur
                    </p>
                  </div>
                  
                  <EditorContentArea
                    content={editorContent || getEditorContentFromSections()}
                    onChange={handleEditorContentChange}
                    placeholder="Commencez à créer votre template PDF..."
                  />
                </Card>
              </div>
            </TabsContent>

            {/* Vue code */}
            <TabsContent value="code" className="flex-1 m-0 p-4 overflow-auto">
              <Card className="h-full">
                <div className="p-4">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(template, null, 2)}
                  </pre>
                </div>
              </Card>
            </TabsContent>

            {/* Aperçu */}
            <TabsContent value="preview" className="flex-1 m-0 p-4 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <TemplatePreview
                  template={template}
                  onSectionSelect={setSelectedSectionId}
                  selectedSectionId={selectedSectionId}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau de propriétés */}
        <PropertiesPanel
          selectedSection={selectedSection}
          onUpdate={handleUpdateSection}
        />
      </div>
    </DndProvider>
  )
}

