'use client'

import { useDrop } from 'react-dnd'
import { useRef, useEffect } from 'react'
import { PDFTemplateSection } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface CanvasAreaProps {
  sections: PDFTemplateSection[]
  onSectionAdd: (type: string, position: { x: number; y: number }) => void
  onSectionSelect: (sectionId: string) => void
  selectedSectionId?: string | null
  className?: string
}

export function CanvasArea({
  sections,
  onSectionAdd,
  onSectionSelect,
  selectedSectionId,
  className
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'pdf-element',
    drop: (item: { elementType: string }, monitor) => {
      if (!canvasRef.current) return
      
      const offset = monitor.getClientOffset()
      if (!offset) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((offset.x - rect.left) / rect.width) * 100
      const y = ((offset.y - rect.top) / rect.height) * 100

      onSectionAdd(item.elementType, { x, y })
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  useEffect(() => {
    if (canvasRef.current) {
      drop(canvasRef.current)
    }
  }, [drop])

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      header: '📋',
      company_header: '🏢',
      table: '📊',
      image: '🖼️',
      qr_code: '🔲',
      signature: '✍️',
      footer: '📄',
      spacer: '─',
    }
    return icons[type] || '📦'
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
    <div
      ref={canvasRef}
      className={cn(
        'relative w-full h-full bg-white border-2 border-dashed rounded-lg overflow-auto',
        isOver && 'border-primary bg-primary/5',
        className
      )}
    >
      {sections.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Zone de création</p>
            <p className="text-sm text-muted-foreground">
              Glissez-déposez des éléments ici ou cliquez sur les éléments de la palette
            </p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full min-h-[800px]">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => onSectionSelect(section.id)}
              className={cn(
                'absolute border-2 rounded p-2 cursor-pointer transition-all',
                selectedSectionId === section.id
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-muted hover:border-primary/50 bg-background'
              )}
              style={{
                left: section.position ? `${section.position.x}%` : '0%',
                top: section.position ? `${section.position.y}%` : '0%',
                width: section.position?.width ? `${section.position.width}%` : 'auto',
                height: section.position?.height ? `${section.position.height}px` : 'auto',
                minWidth: '100px',
                minHeight: '40px',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getSectionIcon(section.type)}</span>
                <span className="text-xs font-medium">{getSectionLabel(section.type)}</span>
              </div>
              {section.content && typeof section.content === 'string' && (
                <p className="text-xs text-muted-foreground truncate">
                  {section.content.substring(0, 30)}
                  {section.content.length > 30 ? '...' : ''}
                </p>
              )}
              {section.dataBinding && (
                <div className="mt-1">
                  <span className="text-xs bg-muted px-1 py-0.5 rounded">
                    {section.dataBinding}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

