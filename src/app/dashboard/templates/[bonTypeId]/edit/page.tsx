'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { api, type PDFTemplate, type BonType, type BonField } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Eye,
  Maximize2,
  Minimize2,
  Type,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExtension from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import LinkExtension from '@tiptap/extension-link'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragCancelEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
// html2pdf.js retiré - on utilise pdfmake côté backend (plus fiable)
import type { PDFField } from '@/lib/api'

// Extension personnalisée pour la taille de police
import { Extension } from '@tiptap/core'
import { Mark } from '@tiptap/core'

const FontSize = Mark.create({
  name: 'fontSize',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="font-size"]',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const fontSize = element.style.fontSize
          return fontSize ? { fontSize } : false
        },
      },
      {
        style: 'font-size',
        getAttrs: (value) => {
          return typeof value === 'string' ? { fontSize: value } : false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes.fontSize) {
      return ['span', {}, 0]
    }
    return ['span', { style: `font-size: ${HTMLAttributes.fontSize}` }, 0]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ commands }) => {
        return commands.setMark(this.name, { fontSize })
      },
      unsetFontSize: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => {
          const fontSize = (element as HTMLElement).style.fontSize
          return fontSize || null
        },
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          }
        },
      },
    }
  },
})

// Composant pour un champ draggable
function DraggableField({ field }: { field: BonField }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.id,
    data: {
      type: 'field',
      field,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const getTypeIcon = (type: BonField['type']) => {
    switch (type) {
      case 'text': return <Type className="h-3 w-3" />
      case 'number': return <Type className="h-3 w-3" />
      case 'date': return <Type className="h-3 w-3" />
      case 'datetime': return <Type className="h-3 w-3" />
      case 'select': return <Type className="h-3 w-3" />
      case 'checkbox': return <Type className="h-3 w-3" />
      default: return <Type className="h-3 w-3" />
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        {getTypeIcon(field.type)}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{field.label}</p>
          <p className="text-xs text-muted-foreground truncate">({field.name})</p>
        </div>
      </div>
    </div>
  )
}

// Composant pour la zone de drop de l'éditeur
function EditorDropZone({ children, editor, isDragging }: { children: React.ReactNode; editor: any; isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-content',
  })

  // Mettre à jour la position du curseur quand on survole avec un champ
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isOver && editor && isDragging) {
      // Trouver la position dans l'éditeur à partir des coordonnées de la souris
      const editorElement = document.querySelector('.ProseMirror')
      if (editorElement) {
        try {
          // Utiliser les coordonnées pour placer le curseur
          const point = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
          if (point) {
            editor.commands.setTextSelection(point.pos)
          }
        } catch (err) {
          // Ignorer les erreurs si l'éditeur n'est pas encore prêt
        }
      }
    }
  }

  return (
    <div
      ref={setNodeRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "flex-1 overflow-auto bg-muted/10 relative flex items-start justify-center py-8",
        isOver && "bg-blue-50/50",
        isDragging && isOver && "ring-2 ring-blue-400 ring-offset-2"
      )}
      id="editor-drop-zone"
    >
      {children}
    </div>
  )
}

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const bonTypeId = params?.bonTypeId as string
  const { t } = useLocale()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bonType, setBonType] = useState<BonType | null>(null)
  const [template, setTemplate] = useState<PDFTemplate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDataBinding, setShowDataBinding] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showColorDialog, setShowColorDialog] = useState(false)
  const [showHighlightDialog, setShowHighlightDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [colorValue, setColorValue] = useState('#000000')
  const [highlightValue, setHighlightValue] = useState('#ffff00')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [selectedText, setSelectedText] = useState('')
  const [isResizingRow, setIsResizingRow] = useState(false)
  const [isResizingCol, setIsResizingCol] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [activeField, setActiveField] = useState<BonField | null>(null)
  const [showFieldsPalette, setShowFieldsPalette] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )
  const resizeRef = useRef<{ type: 'row' | 'col' | null; startPos: number; startSize: number; element: HTMLElement | null }>({
    type: null,
    startPos: 0,
    startSize: 0,
    element: null,
  })

  // Éditeur Tiptap principal
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Commencez à écrire votre template PDF...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      UnderlineExtension,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'table-wrapper',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      FontSize,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8',
        style: 'font-size: 12px;',
      },
    },
    onUpdate: ({ editor }) => {
      // Mettre à jour le template à chaque modification
      if (template) {
        const html = editor.getHTML()
        const sections = convertHTMLToSections(html)
        setTemplate({
          ...template,
          sections,
        })
      }
    },
  })

  // Gestion du redimensionnement des lignes et colonnes
  useEffect(() => {
    if (!editor) return

    let currentResizeType: 'row' | 'col' | null = null
    let resizeStartPos = 0
    let resizeStartSize = 0
    let resizeElement: HTMLElement | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (currentResizeType) {
        // En cours de redimensionnement
        if (currentResizeType === 'row' && resizeElement) {
          const diff = e.clientY - resizeStartPos
          const newHeight = Math.max(30, resizeStartSize + diff)
          resizeElement.style.height = `${newHeight}px`
          resizeElement.style.minHeight = `${newHeight}px`
        } else if (currentResizeType === 'col' && resizeElement) {
          const table = resizeElement.closest('table')
          if (table) {
            const colIndex = Array.from(resizeElement.parentElement!.children).indexOf(resizeElement)
            const diff = e.clientX - resizeStartPos
            const newWidth = Math.max(50, resizeStartSize + diff)
            
            // Appliquer la largeur à toutes les cellules de la colonne
            const rows = table.querySelectorAll('tr')
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td, th')
              if (cells[colIndex]) {
                (cells[colIndex] as HTMLElement).style.width = `${newWidth}px`
                ;(cells[colIndex] as HTMLElement).style.minWidth = `${newWidth}px`
              }
            })
          }
        }
        return
      }

      // Détection du survol pour changer le curseur
      const target = e.target as HTMLElement
      const cell = target.closest('td, th') as HTMLElement
      
      if (cell) {
        const rect = cell.getBoundingClientRect()
        const isNearBottom = e.clientY >= rect.bottom - 4 && e.clientY <= rect.bottom + 4
        const isNearRight = e.clientX >= rect.right - 4 && e.clientX <= rect.right + 4
        
        // Changer le curseur selon la position
        if (isNearBottom && !isNearRight) {
          cell.style.cursor = 'row-resize'
          document.body.style.cursor = 'row-resize'
        } else if (isNearRight && !isNearBottom) {
          cell.style.cursor = 'col-resize'
          document.body.style.cursor = 'col-resize'
        } else {
          cell.style.cursor = 'text'
          document.body.style.cursor = ''
        }
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const cell = target.closest('td, th') as HTMLElement
      
      if (cell) {
        const rect = cell.getBoundingClientRect()
        const isNearBottom = e.clientY >= rect.bottom - 4 && e.clientY <= rect.bottom + 4
        const isNearRight = e.clientX >= rect.right - 4 && e.clientX <= rect.right + 4
        
        // Redimensionnement de ligne
        if (isNearBottom && !isNearRight) {
          const row = cell.parentElement as HTMLElement
          if (row && row.tagName === 'TR') {
            currentResizeType = 'row'
            resizeStartPos = e.clientY
            resizeStartSize = row.offsetHeight
            resizeElement = row
            
            setIsResizingRow(true)
            e.preventDefault()
            e.stopPropagation()
            
            // Empêcher la sélection de texte
            editor.setEditable(false)
            
            const handleMouseUp = () => {
              currentResizeType = null
              resizeStartPos = 0
              resizeStartSize = 0
              resizeElement = null
              setIsResizingRow(false)
              editor.setEditable(true)
              document.body.style.cursor = ''
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }
        }
        // Redimensionnement de colonne
        else if (isNearRight && !isNearBottom) {
          const table = cell.closest('table')
          if (table) {
            currentResizeType = 'col'
            resizeStartPos = e.clientX
            resizeStartSize = cell.offsetWidth
            resizeElement = cell
            
            setIsResizingCol(true)
            e.preventDefault()
            e.stopPropagation()
            
            // Empêcher la sélection de texte
            editor.setEditable(false)
            
            const handleMouseUp = () => {
              currentResizeType = null
              resizeStartPos = 0
              resizeStartSize = 0
              resizeElement = null
              setIsResizingCol(false)
              editor.setEditable(true)
              document.body.style.cursor = ''
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('mousemove', handleMouseMove)
    editorElement.addEventListener('mousedown', handleMouseDown)
    
    return () => {
      editorElement.removeEventListener('mousemove', handleMouseMove)
      editorElement.removeEventListener('mousedown', handleMouseDown)
    }
  }, [editor])

  useEffect(() => {
    if (user && bonTypeId) {
      loadData()
    }
  }, [user, bonTypeId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const bonTypeData = await api.getBonType(bonTypeId)
      setBonType(bonTypeData)
      
      try {
        const templateData = await api.getTemplate(bonTypeId)
        if (templateData) {
          // Normaliser les marges : remplacer 50 par 2.5 si nécessaire
          const normalizedTemplate = { ...templateData }
          if (normalizedTemplate.margins) {
            if (normalizedTemplate.margins.top === 50) normalizedTemplate.margins.top = 2.5
            if (normalizedTemplate.margins.bottom === 50) normalizedTemplate.margins.bottom = 2.5
            if (normalizedTemplate.margins.left === 50) normalizedTemplate.margins.left = 2.5
            if (normalizedTemplate.margins.right === 50) normalizedTemplate.margins.right = 2.5
          }
          if (normalizedTemplate.layout?.margins) {
            if (normalizedTemplate.layout.margins.top === 50) normalizedTemplate.layout.margins.top = 2.5
            if (normalizedTemplate.layout.margins.bottom === 50) normalizedTemplate.layout.margins.bottom = 2.5
            if (normalizedTemplate.layout.margins.left === 50) normalizedTemplate.layout.margins.left = 2.5
            if (normalizedTemplate.layout.margins.right === 50) normalizedTemplate.layout.margins.right = 2.5
          }
          setTemplate(normalizedTemplate)
          
          // Sauvegarder automatiquement la normalisation si des valeurs ont été corrigées
          const needsUpdate = 
            (templateData.margins && (
              templateData.margins.top === 50 || 
              templateData.margins.bottom === 50 || 
              templateData.margins.left === 50 || 
              templateData.margins.right === 50
            )) ||
            (templateData.layout?.margins && (
              templateData.layout.margins.top === 50 || 
              templateData.layout.margins.bottom === 50 || 
              templateData.layout.margins.left === 50 || 
              templateData.layout.margins.right === 50
            ))
          
          if (needsUpdate) {
            // Sauvegarder silencieusement la correction
            try {
              await api.saveTemplate(bonTypeId, normalizedTemplate)
            } catch (err) {
              console.error('Erreur lors de la sauvegarde de la normalisation:', err)
            }
          }
          
          // Charger le contenu dans l'éditeur si disponible
          if (editor && normalizedTemplate.sections && normalizedTemplate.sections.length > 0) {
            // Convertir les sections en HTML pour l'éditeur
            const html = convertSectionsToHTML(normalizedTemplate.sections)
            editor.commands.setContent(html)
          }
        } else {
          setTemplate(null)
        }
      } catch (err: any) {
        if (
          err.message?.includes('404') || 
          err.message?.includes('not found') ||
          err.message?.includes('Template non trouvé')
        ) {
          setTemplate(null)
        } else {
          console.error('Error loading template:', err)
          setTemplate(null)
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Convertir les sections en HTML pour l'éditeur
  const convertSectionsToHTML = (sections: any[]): string => {
    return sections.map(section => {
      if (section.type === 'text' || section.type === 'header') {
        return typeof section.content === 'string' ? section.content : ''
      }
      return ''
    }).join('')
  }

  const handleCreateDefault = async () => {
    try {
      setSaving(true)
      setError(null)
      const result = await api.createDefaultTemplate(bonTypeId)
      setTemplate(result.template)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error creating default template:', err)
      setError(err.message || 'Erreur lors de la création du template par défaut')
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour convertir les couleurs CSS modernes en RGB/hex
  const convertColorToRGB = (color: string): string => {
    if (!color || color === 'transparent') return '#ffffff'
    
    // Si c'est déjà en format hex ou rgb, retourner tel quel
    if (color.startsWith('#') || color.startsWith('rgb')) {
      return color
    }
    
    // Si c'est une couleur nommée CSS, créer un élément temporaire pour la convertir
    const tempDiv = document.createElement('div')
    tempDiv.style.color = color
    document.body.appendChild(tempDiv)
    const computedColor = window.getComputedStyle(tempDiv).color
    document.body.removeChild(tempDiv)
    
    return computedColor
  }

  // Fonction pour normaliser les styles CSS avant la génération PDF
  const normalizeStylesForPDF = (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element)
    
    // Convertir les couleurs modernes en RGB
    if (computedStyle.color) {
      element.style.color = convertColorToRGB(computedStyle.color)
    }
    if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      element.style.backgroundColor = convertColorToRGB(computedStyle.backgroundColor)
    }
    if (computedStyle.borderColor) {
      element.style.borderColor = convertColorToRGB(computedStyle.borderColor)
    }
    
    // Normaliser les autres propriétés problématiques
    const allChildren = element.querySelectorAll('*')
    allChildren.forEach((child) => {
      const childEl = child as HTMLElement
      const childStyle = window.getComputedStyle(childEl)
      
      if (childStyle.color) {
        childEl.style.color = convertColorToRGB(childStyle.color)
      }
      if (childStyle.backgroundColor && childStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        childEl.style.backgroundColor = convertColorToRGB(childStyle.backgroundColor)
      }
      if (childStyle.borderColor) {
        childEl.style.borderColor = convertColorToRGB(childStyle.borderColor)
      }
    })
  }

  // Fonction pour extraire les positions des champs depuis l'éditeur réel
  const extractFieldPositionsFromEditor = (): PDFField[] => {
    if (!editor) {
      return []
    }

    const fields: PDFField[] = []
    const editorElement = editor.view.dom
    
    // Trouver tous les spans avec data-binding dans l'éditeur
    const spans = editorElement.querySelectorAll('span[data-binding]')
    
    const pageSize = template?.pageSize || template?.layout?.pageSize || 'A4'
    const orientation = template?.orientation || template?.layout?.orientation || 'portrait'
    const margins = template?.margins || template?.layout?.margins || { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
    
    // Dimensions en mm
    const pageWidth = pageSize === 'A4' ? 210 : pageSize === 'A3' ? 297 : 216
    const pageHeight = pageSize === 'A4' ? 297 : pageSize === 'A3' ? 420 : 279
    
    spans.forEach((span, index) => {
      const element = span as HTMLElement
      const rect = element.getBoundingClientRect()
      const editorRect = editorElement.getBoundingClientRect()
      
      // Calculer la position relative à l'éditeur (en pixels)
      const xPx = rect.left - editorRect.left
      const yPx = rect.top - editorRect.top
      
      // Convertir pixels en mm puis en points
      // 1px ≈ 0.264583mm à 96dpi, 1mm = 2.83465 points
      const xMm = xPx * 0.264583
      const yMm = yPx * 0.264583
      const xPoints = xMm * 2.83465
      const yPoints = yMm * 2.83465
      
      // pdf-lib utilise Y depuis le bas
      const pageHeightMm = orientation === 'landscape' ? pageWidth : pageHeight
      const yFromBottomMm = pageHeightMm - yMm - margins.top - margins.bottom
      const yFromBottomPoints = yFromBottomMm * 2.83465
      
      const binding = element.getAttribute('data-binding') || ''
      const fieldName = binding.replace('bon.values.', '')
      
      // Obtenir les styles
      const computedStyle = window.getComputedStyle(element)
      const fontSize = parseFloat(computedStyle.fontSize) || 12
      const color = computedStyle.color || '#000000'
      const fontWeight = computedStyle.fontWeight
      const fontStyle = computedStyle.fontStyle
      
      // Vérifier si c'est dans un tableau
      const tableInfo = extractTableInfo(element, editorElement)
      
      fields.push({
        id: `field_${index}`,
        fieldName,
        position: {
          x: (margins.left * 2.83465) + xPoints, // Ajouter la marge gauche
          y: yFromBottomPoints,
          width: (rect.width * 0.264583) * 2.83465,
          height: (rect.height * 0.264583) * 2.83465,
          page: 1
        },
        style: {
          fontSize: fontSize,
          color: color,
          bold: parseInt(fontWeight) >= 600,
          italic: fontStyle === 'italic'
        },
        isArray: false,
        tableInfo: tableInfo
      })
    })
    
    return fields
  }

  // Fonction pour extraire les positions exactes des champs depuis le DOM
  const extractFieldPositions = (
    container: HTMLElement,
    margins: { top: number; right: number; bottom: number; left: number },
    pageWidth: number
  ): PDFField[] => {
    const fields: PDFField[] = []
    const spans = container.querySelectorAll('span[data-binding]')
    
    spans.forEach((span, index) => {
      const element = span as HTMLElement
      const rect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // Calculer la position relative au container (en pixels)
      const xPx = rect.left - containerRect.left
      const yPx = rect.top - containerRect.top
      
      // Convertir pixels en mm (1px ≈ 0.264583mm à 96dpi)
      const xMm = xPx * 0.264583
      const yMm = yPx * 0.264583
      
      // Convertir mm en points pour pdf-lib (1mm = 2.83465 points)
      const xPoints = xMm * 2.83465
      const yPoints = yMm * 2.83465
      
      // pdf-lib utilise Y depuis le bas, donc on doit inverser
      const pageHeightMm = 297 // A4 height en mm (sera ajusté selon le format)
      const yFromBottomMm = pageHeightMm - yMm
      const yFromBottomPoints = yFromBottomMm * 2.83465
      
      const binding = element.getAttribute('data-binding') || ''
      const fieldName = binding.replace('bon.values.', '')
      
      // Obtenir les styles
      const computedStyle = window.getComputedStyle(element)
      const fontSize = parseFloat(computedStyle.fontSize) || 12
      const color = computedStyle.color || '#000000'
      const fontWeight = computedStyle.fontWeight
      const fontStyle = computedStyle.fontStyle
      
      // Vérifier si c'est dans un tableau
      const tableInfo = extractTableInfo(element, container)
      
      fields.push({
        id: `field_${index}`,
        fieldName,
        position: {
          x: xPoints,
          y: yFromBottomPoints, // Y depuis le bas pour pdf-lib
          width: (rect.width * 0.264583) * 2.83465, // Largeur en points
          height: (rect.height * 0.264583) * 2.83465, // Hauteur en points
          page: 1
        },
        style: {
          fontSize: fontSize,
          color: color,
          bold: parseInt(fontWeight) >= 600,
          italic: fontStyle === 'italic'
        },
        isArray: false,
        tableInfo: tableInfo
      })
    })
    
    return fields
  }

  // Fonction pour extraire les informations de tableau
  const extractTableInfo = (element: HTMLElement, container: HTMLElement): PDFField['tableInfo'] | undefined => {
    let current: HTMLElement | null = element.parentElement
    
    // Chercher le tableau parent
    while (current && current.tagName !== 'TABLE') {
      current = current.parentElement
    }
    
    if (!current) return undefined
    
    // Trouver la ligne (tr) parente
    let row: HTMLElement | null = element.parentElement
    while (row && row.tagName !== 'TR') {
      row = row.parentElement
    }
    
    if (!row) return undefined
    
    // Compter les lignes avant celle-ci
    const table = current as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))
    const rowIndex = rows.indexOf(row as HTMLTableRowElement)
    
    // Compter les cellules avant celle-ci dans la ligne
    const cells = Array.from(row.querySelectorAll('td, th'))
    const cellElement = element.closest('td, th') as HTMLElement
    const columnIndex = cellElement ? cells.indexOf(cellElement) : 0
    
    return {
      rowIndex: rowIndex,
      columnIndex: columnIndex,
      tableId: `table_${table.getBoundingClientRect().top}`
    }
  }

  const handleSave = async () => {
    if (!template || !editor) {
      setError('Aucun template à sauvegarder')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      // Récupérer le contenu HTML de l'éditeur
      const html = editor.getHTML()
      
      // Extraire les positions des champs depuis l'éditeur réel
      // Le PDF sera généré côté backend avec pdfmake (plus fiable)
      const fields = extractFieldPositionsFromEditor()
      
      const updatedTemplate: PDFTemplate = {
        ...template,
        // Sauvegarder le HTML directement dans content
        content: html,
        // Le PDF sera généré côté backend, pas besoin de templateFileBase64
        // Positions exactes des champs calculées depuis le DOM de l'éditeur
        fields: fields,
        // Conserver sections pour compatibilité avec l'ancien format
        sections: convertHTMLToSections(html),
        // S'assurer que pageSize, orientation et margins sont inclus
        pageSize: (template.pageSize || template.layout?.pageSize || 'A4') as 'A4' | 'A3' | 'Letter' | 'Legal',
        orientation: (template.orientation || template.layout?.orientation || 'portrait') as 'portrait' | 'landscape',
        margins: template.margins || template.layout?.margins || { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      }
      
      await api.saveTemplate(bonTypeId, updatedTemplate)
      setTemplate(updatedTemplate)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error saving template:', err)
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Convertir le HTML en sections pour le backend
  const convertHTMLToSections = (html: string): any[] => {
    // Pour l'instant, on crée une seule section texte avec tout le contenu
    // Vous pouvez améliorer cela pour parser le HTML et créer plusieurs sections
    return [{
      id: `section-${Date.now()}`,
      type: 'text',
      content: html,
      position: { x: 0, y: 0, width: 100 },
      style: {
        fontSize: 12,
        fontWeight: 'normal',
        alignment: 'left',
      },
    }]
  }

  const updateLayout = (field: string, value: any) => {
    if (!template) return
    
    // Normaliser la structure du template
    const updatedTemplate = { ...template }
    
    if (field === 'pageSize' || field === 'orientation') {
      // Mettre à jour directement dans template (pas dans layout)
      updatedTemplate[field] = value
      // Garder layout pour compatibilité mais mettre à jour aussi
      if (updatedTemplate.layout) {
        updatedTemplate.layout = {
          ...updatedTemplate.layout,
          [field]: value,
        }
      }
    } else if (field === 'margins') {
      // Mettre à jour les marges
      updatedTemplate.margins = value
      if (updatedTemplate.layout) {
        updatedTemplate.layout = {
          ...updatedTemplate.layout,
          margins: value,
        }
      }
    }
    
    setTemplate(updatedTemplate)
  }

  // Fonction pour convertir une image en base64
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (base64) {
        editor.chain().focus().setImage({ src: base64 }).run()
        setShowImageDialog(false)
        setImageUrl('')
      }
    }
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier')
    }
    reader.readAsDataURL(file)
  }

  // Fonction pour lier du texte sélectionné à un champ
  // IMPORTANT: Le data-binding "bon.values.{fieldName}" indique où la valeur du champ sera placée
  // lors de la génération du PDF. Quand un utilisateur crée un bon, les valeurs qu'il saisit
  // dans le formulaire seront automatiquement remplacées à ces emplacements dans le template.
  const handleLinkToField = (fieldName: string, fieldLabel?: string) => {
    if (!editor) return
    
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)
    const displayText = selectedText || fieldLabel || fieldName
    
    // Insérer le champ avec data-binding à la position actuelle du curseur
    // Le data-binding indique où la valeur sera remplacée lors de la génération du PDF
    editor.chain()
      .focus()
      .insertContent(`<span data-binding="bon.values.${fieldName}" style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${displayText}</span>`)
      .run()
    
    setShowDataBinding(false)
  }

  // Gestion du drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const field = bonType?.fields?.find(f => f.id === active.id)
    if (field) {
      setActiveField(field)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveField(null)
    
    if (!over || !editor) return
    
    // Vérifier si on a déposé sur l'éditeur
    // over.id est une string (l'ID du droppable), pas un Node
    const isOverEditor = over.id === 'editor-content' || String(over.id) === 'editor-drop-zone'
    
    if (isOverEditor) {
      const field = bonType?.fields?.find(f => f.id === active.id)
      if (field) {
        // Utiliser un timeout pour s'assurer que le DOM est mis à jour
        setTimeout(() => {
          if (!editor) return
          
          // S'assurer que l'éditeur a le focus
          editor.commands.focus()
          
          // Insérer le champ à la position actuelle du curseur
          // Le data-binding "bon.values.{fieldName}" indique où la valeur sera placée lors de la génération du PDF
          // Quand un utilisateur crée un bon et remplit le formulaire, les valeurs seront automatiquement
          // remplacées à ces emplacements dans le template PDF généré
          handleLinkToField(field.name, field.label)
        }, 10)
      }
    }
  }

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveField(null)
  }

  // Toolbar complète comme Google Docs
  const Toolbar = () => {
    if (!editor) return null

    return (
      <div className="border-b bg-background p-2 flex items-center gap-1 flex-wrap overflow-x-auto">
        {/* Annuler/Refaire */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Styles de texte */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Select
            value={editor.isActive('heading', { level: 1 }) ? 'h1' : 
                   editor.isActive('heading', { level: 2 }) ? 'h2' :
                   editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'}
            onValueChange={(value) => {
              if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run()
              else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run()
              else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run()
              else editor.chain().focus().setParagraph().run()
            }}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Normal</SelectItem>
              <SelectItem value="h1">Titre 1</SelectItem>
              <SelectItem value="h2">Titre 2</SelectItem>
              <SelectItem value="h3">Titre 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Police */}


        {/* Formatage */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-accent' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-accent' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-accent' : ''}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-accent' : ''}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        {/* Couleurs */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const color = prompt('Couleur du texte (hex):', '#000000')
              if (color) editor.chain().focus().setColor(color).run()
            }}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const color = prompt('Couleur de surlignage (hex):', '#ffff00')
              if (color) editor.chain().focus().toggleHighlight({ color }).run()
            }}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignement */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'bg-accent' : ''}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        {/* Listes */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Insertion */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImageUrl('')
              setShowImageDialog(true)
            }}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLinkUrl('')
              setShowLinkDialog(true)
            }}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTableDialog(true)}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Contrôles de tableau (si dans un tableau) */}
        {editor.isActive('table') && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              + Col
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              - Col
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              + Ligne
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              - Ligne
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Suppr. Tableau
            </Button>
          </div>
        )}

        {/* Lier à un champ */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDataBinding(true)}
          >
            <Type className="h-4 w-4" />
            <span className="ml-1 text-xs">Lier</span>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
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
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-screen",
      isFullscreen && "fixed inset-0 z-50 bg-background"
    )}>
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              {bonType?.name || 'Template PDF'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {bonType?.code || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!template && (
            <Button 
              onClick={handleCreateDefault} 
              disabled={saving}
              variant="outline"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Créer un template
            </Button>
          )}
          {template && (
            <>
              <Button 
                variant="outline"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Réduire
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Plein écran
                  </>
                )}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Sauvegarder
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">Template sauvegardé avec succès !</span>
        </div>
      )}

      {/* Vérifier si le bon-type a des champs */}
      {bonType && (!bonType.fields || bonType.fields.length === 0) ? (
        <Card className="m-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Champs requis
            </CardTitle>
            <CardDescription>
              Avant de créer un template PDF, vous devez d'abord définir les champs (structure) de ce type de bon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les champs définissent la structure du formulaire qui sera utilisé pour créer les bons de ce type.
              Une fois les champs créés, vous pourrez les placer dans le template PDF via glisser-déposer.
            </p>
            <div className="flex gap-3">
              <Link href={`/dashboard/bon-types/${bonTypeId}/edit`}>
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Aller à la configuration du type de bon
                </Button>
              </Link>
              <Link href="/dashboard/bon-types">
                <Button variant="outline">
                  Retour à la liste des types de bons
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : !template ? (
        <Card className="m-6">
          <CardHeader>
            <CardTitle>Aucun template configuré</CardTitle>
            <CardDescription>
              Ce type de bon n'a pas encore de template PDF. Créez-en un pour commencer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateDefault} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer un template par défaut'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Configuration rapide */}
          <div className="border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Taille:</Label>
                <Select
                  value={template.pageSize || template.layout?.pageSize || 'A4'}
                  onValueChange={(value) => updateLayout('pageSize', value)}
                >
                  <SelectTrigger className="w-24 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Orientation:</Label>
                <Select
                  value={template.orientation || template.layout?.orientation || 'portrait'}
                  onValueChange={(value) => updateLayout('orientation', value)}
                >
                  <SelectTrigger className="w-32 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Paysage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Label className="text-xs">Padding (mm):</Label>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs w-4">H:</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-16 h-7 text-xs"
                      value={template.margins?.top ?? template.layout?.margins?.top ?? 2.5}
                      onChange={(e) => {
                        const top = Number(e.target.value) || 2.5
                        const margins = {
                          top,
                          right: template.margins?.right ?? template.layout?.margins?.right ?? 2.5,
                          bottom: template.margins?.bottom ?? template.layout?.margins?.bottom ?? 2.5,
                          left: template.margins?.left ?? template.layout?.margins?.left ?? 2.5,
                        }
                        updateLayout('margins', margins)
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs w-4">D:</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-16 h-7 text-xs"
                      value={template.margins?.right ?? template.layout?.margins?.right ?? 2.5}
                      onChange={(e) => {
                        const right = Number(e.target.value) || 2.5
                        const margins = {
                          top: template.margins?.top ?? template.layout?.margins?.top ?? 2.5,
                          right,
                          bottom: template.margins?.bottom ?? template.layout?.margins?.bottom ?? 2.5,
                          left: template.margins?.left ?? template.layout?.margins?.left ?? 2.5,
                        }
                        updateLayout('margins', margins)
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs w-4">B:</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-16 h-7 text-xs"
                      value={template.margins?.bottom ?? template.layout?.margins?.bottom ?? 2.5}
                      onChange={(e) => {
                        const bottom = Number(e.target.value) || 2.5
                        const margins = {
                          top: template.margins?.top ?? template.layout?.margins?.top ?? 2.5,
                          right: template.margins?.right ?? template.layout?.margins?.right ?? 2.5,
                          bottom,
                          left: template.margins?.left ?? template.layout?.margins?.left ?? 2.5,
                        }
                        updateLayout('margins', margins)
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs w-4">G:</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-16 h-7 text-xs"
                      value={template.margins?.left ?? template.layout?.margins?.left ?? 2.5}
                      onChange={(e) => {
                        const left = Number(e.target.value) || 2.5
                        const margins = {
                          top: template.margins?.top ?? template.layout?.margins?.top ?? 2.5,
                          right: template.margins?.right ?? template.layout?.margins?.right ?? 2.5,
                          bottom: template.margins?.bottom ?? template.layout?.margins?.bottom ?? 2.5,
                          left,
                        }
                        updateLayout('margins', margins)
                      }}
                    />
                  </div>
                </div>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Label className="text-xs">Zoom:</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setZoom(Math.max(25, zoom - 10))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="25"
                    max="200"
                    className="w-16 h-7 text-xs text-center"
                    value={zoom}
                    onChange={(e) => setZoom(Math.max(25, Math.min(200, Number(e.target.value) || 100)))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setZoom(100)}
                  >
                    100%
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          {editor && <Toolbar />}

          {/* Éditeur principal avec palette */}
          <div className="flex-1 overflow-hidden flex">
            {/* Palette de champs */}
            {showFieldsPalette && bonType?.fields && bonType.fields.length > 0 && (
              <div className="w-64 border-r bg-background overflow-y-auto">
                <div className="p-4 border-b sticky top-0 bg-background z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold">Champs disponibles</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Glissez-déposez dans l'éditeur pour indiquer où la valeur apparaîtra
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowFieldsPalette(false)}
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Glissez-déposez un champ dans l'éditeur
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {bonType.fields.map((field) => (
                    <DraggableField key={field.id} field={field} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Bouton pour afficher la palette si elle est cachée */}
            {!showFieldsPalette && (
              <Button
                variant="outline"
                size="sm"
                className="absolute left-2 top-2 z-20"
                onClick={() => setShowFieldsPalette(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Afficher les champs
              </Button>
            )}

            {/* Zone d'édition */}
            <EditorDropZone editor={editor} isDragging={!!activeField}>
            <div 
              className="bg-white shadow-lg relative"
              style={{
                width: template.orientation === 'landscape' ? '297mm' : '210mm',
                minHeight: template.orientation === 'landscape' ? '210mm' : '297mm',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                padding: `${(template.margins?.top ?? template.layout?.margins?.top ?? 2.5)}mm ${(template.margins?.right ?? template.layout?.margins?.right ?? 2.5)}mm ${(template.margins?.bottom ?? template.layout?.margins?.bottom ?? 2.5)}mm ${(template.margins?.left ?? template.layout?.margins?.left ?? 2.5)}mm`,
              }}
            >
              <style jsx global>{`
                .ProseMirror {
                  font-size: 12px;
                }
                .ProseMirror p,
                .ProseMirror li,
                .ProseMirror div {
                  font-size: inherit;
                }
                .ProseMirror [data-binding] {
                  background-color: #fef3c7 !important;
                  padding: 2px 4px !important;
                  border-radius: 3px !important;
                  font-weight: 500 !important;
                }
                .ProseMirror table {
                  border: 2px solid #d1d5db !important;
                  border-collapse: collapse !important;
                  margin: 1rem 0 !important;
                  width: 100% !important;
                }
                .ProseMirror table td,
                .ProseMirror table th {
                  border: 1px solid #d1d5db !important;
                  padding: 0.75rem !important;
                  min-width: 100px !important;
                  position: relative;
                  cursor: text;
                }
                .ProseMirror table th {
                  background-color: #f3f4f6 !important;
                  font-weight: 600 !important;
                }
                .ProseMirror table tr:hover {
                  background-color: #f9fafb !important;
                }
                .ProseMirror table td.selectedCell,
                .ProseMirror table th.selectedCell {
                  background-color: #e0e7ff !important;
                }
                /* Zone de redimensionnement uniquement sur les bordures */
                .ProseMirror table td:not(:last-child),
                .ProseMirror table th:not(:last-child) {
                  border-right: 1px solid #d1d5db !important;
                }
                /* Handle de redimensionnement visible uniquement au survol de la bordure */
                .ProseMirror .column-resize-handle {
                  position: absolute;
                  right: -2px;
                  top: 0;
                  bottom: 0;
                  width: 4px;
                  background-color: hsl(var(--primary));
                  pointer-events: all;
                  cursor: col-resize !important;
                  opacity: 0;
                  transition: opacity 0.2s;
                  z-index: 10;
                }
                .ProseMirror .column-resize-handle:hover {
                  opacity: 1;
                }
                /* Zone invisible sur la bordure droite pour activer le curseur col-resize */
                .ProseMirror table td:not(:last-child)::before,
                .ProseMirror table th:not(:last-child)::before {
                  content: '';
                  position: absolute;
                  right: -2px;
                  top: 0;
                  bottom: 0;
                  width: 4px;
                  pointer-events: all;
                  cursor: col-resize;
                  z-index: 11;
                }
                .ProseMirror table td:not(:last-child):hover::before,
                .ProseMirror table th:not(:last-child):hover::before {
                  background-color: hsl(var(--primary));
                  opacity: 0.2;
                }
                /* Zone de redimensionnement pour les lignes (bordures inférieures) */
                .ProseMirror table tr:not(:last-child) td,
                .ProseMirror table tr:not(:last-child) th {
                  border-bottom: 1px solid #d1d5db !important;
                }
                /* Zone invisible sur la bordure inférieure pour activer le curseur row-resize */
                .ProseMirror table tr:not(:last-child) td::after,
                .ProseMirror table tr:not(:last-child) th::after {
                  content: '';
                  position: absolute;
                  left: 0;
                  right: 0;
                  bottom: -2px;
                  height: 4px;
                  pointer-events: all;
                  cursor: row-resize;
                  z-index: 11;
                }
                .ProseMirror table tr:not(:last-child) td:hover::after,
                .ProseMirror table tr:not(:last-child) th:hover::after {
                  background-color: hsl(var(--primary));
                  opacity: 0.2;
                }
                /* Handle de redimensionnement des lignes */
                .ProseMirror .row-resize-handle {
                  position: absolute;
                  left: 0;
                  right: 0;
                  bottom: -2px;
                  height: 4px;
                  background-color: hsl(var(--primary));
                  pointer-events: all;
                  cursor: row-resize !important;
                  opacity: 0;
                  transition: opacity 0.2s;
                  z-index: 10;
                }
                .ProseMirror .row-resize-handle:hover {
                  opacity: 1;
                }
              `}</style>
              {editor && <EditorContent editor={editor} />}
            </div>
            </EditorDropZone>
            </div>
          
          {/* DragOverlay pour le feedback visuel */}
          {activeField && (
            <DragOverlay>
              <div className="p-2 rounded-md border bg-card shadow-lg">
                <div className="flex items-center gap-2">
                  <Type className="h-3 w-3" />
                  <div>
                    <p className="text-xs font-medium">{activeField.label}</p>
                    <p className="text-xs text-muted-foreground">({activeField.name})</p>
                  </div>
                </div>
              </div>
            </DragOverlay>
          )}
        </div>
        </DndContext>
      )}

      {/* Dialog pour lier du texte à un champ */}
      <Dialog open={showDataBinding} onOpenChange={setShowDataBinding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier du texte à un champ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un champ pour lier le texte sélectionné
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bonType?.fields?.map((field) => (
                <Button
                  key={field.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleLinkToField(field.name)}
                >
                  <Type className="h-4 w-4 mr-2" />
                  {field.label} ({field.name})
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour créer un tableau */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer un tableau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de lignes</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de colonnes</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTableDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertTable({
                      rows: tableRows,
                      cols: tableCols,
                      withHeaderRow: true,
                    }).run()
                    setShowTableDialog(false)
                  }
                }}
              >
                Insérer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour la couleur du texte */}
      <Dialog open={showColorDialog} onOpenChange={setShowColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couleur du texte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Couleur (hex):</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={colorValue}
                  onChange={(e) => setColorValue(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorValue}
                  onChange={(e) => setColorValue(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowColorDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (editor && colorValue) {
                    editor.chain().focus().setColor(colorValue).run()
                    setShowColorDialog(false)
                  }
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour la couleur de surlignage */}
      <Dialog open={showHighlightDialog} onOpenChange={setShowHighlightDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couleur de surlignage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Couleur (hex):</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={highlightValue}
                  onChange={(e) => setHighlightValue(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={highlightValue}
                  onChange={(e) => setHighlightValue(e.target.value)}
                  placeholder="#ffff00"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowHighlightDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (editor && highlightValue) {
                    editor.chain().focus().toggleHighlight({ color: highlightValue }).run()
                    setShowHighlightDialog(false)
                  }
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour insérer un lien */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer un lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL du lien:</Label>
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (editor && linkUrl) {
                    editor.chain().focus().setLink({ href: linkUrl }).run()
                    setShowLinkDialog(false)
                    setLinkUrl('')
                  }
                }}
              >
                Insérer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour insérer une image */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insérer une image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Choisir une image depuis votre appareil:</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Ou entrer une URL:</Label>
              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowImageDialog(false)
                setImageUrl('')
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (editor && imageUrl) {
                    editor.chain().focus().setImage({ src: imageUrl }).run()
                    setShowImageDialog(false)
                    setImageUrl('')
                  }
                }}
                disabled={!imageUrl}
              >
                Insérer depuis URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
