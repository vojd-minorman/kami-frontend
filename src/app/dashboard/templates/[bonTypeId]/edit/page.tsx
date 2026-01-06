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
import { api, type PDFTemplate, type BonType, type BonField, type BonFieldGroup } from '@/lib/api'
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
  Layers,
  Grid3x3,
  FileSignature,
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
import { Extension, Mark } from '@tiptap/core'

// Plus besoin de l'extension DataBinding - on utilise maintenant des placeholders {{bon.values.fieldName}}
// qui seront remplacés directement dans le HTML lors de la génération du PDF avec Puppeteer

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

// Composant pour un emplacement de signature draggable
function DraggableSignature({ 
  label, 
  placeholder, 
  order 
}: { 
  label: string
  placeholder: string
  order?: number 
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `signature-${placeholder}`,
    data: {
      type: 'signature',
      placeholder,
      order,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded-md border bg-blue-50 hover:bg-blue-100 cursor-grab active:cursor-grabbing transition-colors border-blue-200",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <FileSignature className="h-3 w-3 text-blue-600" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-blue-900">{label}</p>
          <p className="text-xs text-blue-600 truncate">({`{{${placeholder}}}`})</p>
        </div>
      </div>
    </div>
  )
}

// Composant pour un champ de groupe draggable
function DraggableGroupField({ 
  field, 
  groupName, 
  groupLabel,
  isRepeatable 
}: { 
  field: BonField
  groupName: string
  groupLabel: string
  isRepeatable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `group-${groupName}-${field.id}`,
    data: {
      type: 'group-field',
      field,
      groupName,
      groupLabel,
      isRepeatable,
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
        "px-2 py-1.5 rounded text-xs bg-background border border-border/50 hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        {getTypeIcon(field.type)}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{field.label}</p>
          <p className="text-muted-foreground truncate text-[10px]">
            {groupLabel} • {field.name}
            {isRepeatable && <span className="ml-1 text-primary">[Répétable]</span>}
          </p>
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
    parseOptions: {
      preserveWhitespace: 'full',
    },
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

  // Plus besoin d'extraire les positions - les placeholders {{bon.values.fieldName}} 
  // seront remplacés directement dans le HTML lors de la génération du PDF avec Puppeteer

  const handleSave = async () => {
    if (!template || !editor) {
      setError('Aucun template à sauvegarder')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      // Récupérer le contenu HTML de l'éditeur
      // Les placeholders {{bon.values.fieldName}} seront remplacés lors de la génération du PDF
      const html = editor.getHTML()
      
      console.log('Saving template HTML with placeholders')
      console.log('HTML content length:', html.length)
      
      // Compter les placeholders dans le HTML
      const placeholderMatches = html.match(/\{\{bon\.values\.\w+\}\}/g)
      const placeholderCount = placeholderMatches?.length || 0
      console.log('Found placeholders:', placeholderCount)
      
      const updatedTemplate: PDFTemplate = {
        ...template,
        // Sauvegarder le HTML directement dans content
        // Les placeholders {{bon.values.fieldName}} seront remplacés par Puppeteer lors de la génération
        content: html,
        // Plus besoin de fields ni de positions - tout est dans le HTML avec les placeholders
        fields: [],
        // Conserver sections pour compatibilité avec l'ancien format
        sections: convertHTMLToSections(html),
        // S'assurer que pageSize, orientation et margins sont inclus
        pageSize: (template.pageSize || template.layout?.pageSize || 'A4') as 'A4' | 'A3' | 'Letter' | 'Legal',
        orientation: (template.orientation || template.layout?.orientation || 'portrait') as 'portrait' | 'landscape',
        margins: template.margins || template.layout?.margins || { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      }
      
      console.log('Saving template with', placeholderCount, 'placeholders')
      
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

  // Fonction pour insérer un tableau de groupe répétable
  const handleInsertRepeatableGroup = (group: BonFieldGroup) => {
    if (!editor || !group.fields || group.fields.length === 0) {
      console.warn('Editor or group fields not available')
      return
    }

    // Créer un tableau avec une ligne d'en-tête et une ligne de données
    // Pour les groupes répétables, bon.values.groupName est un array d'objets
    // Format dans bon.values: { "groupName": [{field1: val1, field2: val2}, ...] }
    // On utilise des placeholders avec le format: {{bon.values.groupName.fieldName}}
    // Le backend devra être modifié pour gérer cette structure imbriquée
    
    // Ligne d'en-tête avec les labels
    const headerRow = group.fields.map(field => 
      `<th>${field.label}</th>`
    ).join('')
    
    // Ligne de données avec les placeholders
    // Format: {{bon.values.groupName.fieldName}}
    // Note: Le backend actuel ne gère pas encore les groupes imbriqués,
    // mais on prépare la structure pour une future implémentation
    const dataRow = group.fields.map(field => 
      `<td><span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">{{bon.values.${group.name}.${field.name}}}</span></td>`
    ).join('')
    
    const tableHTML = `<table>
      <tr>${headerRow}</tr>
      <tr>${dataRow}</tr>
    </table>`
    
    editor.chain()
      .focus()
      .insertContent(tableHTML, {
        parseOptions: {
          preserveWhitespace: 'full',
        },
      })
      .run()
  }

  // Fonction pour insérer les champs d'un groupe simple (non répétable)
  const handleInsertSimpleGroup = (group: BonFieldGroup) => {
    if (!editor || !group.fields || group.fields.length === 0) {
      console.warn('Editor or group fields not available')
      return
    }

    // Insérer les champs avec leur label et le placeholder
    // Format: {{bon.values.groupName.fieldName}}
    const fieldsHTML = group.fields.map(field => {
      const placeholder = `{{bon.values.${group.name}.${field.name}}}`
      return `<p><strong>${field.label}:</strong> <span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${placeholder}</span></p>`
    }).join('')
    
    editor.chain()
      .focus()
      .insertContent(fieldsHTML, {
        parseOptions: {
          preserveWhitespace: 'full',
        },
      })
      .run()
  }

  // Fonction pour lier du texte sélectionné à un champ
  // IMPORTANT: On utilise maintenant des placeholders {{bon.values.fieldName}} qui seront remplacés
  // lors de la génération du PDF avec Puppeteer. Plus besoin de calculer les positions !
  // Pour les champs de groupes: {{bon.values.groupName.fieldName}}
  const handleLinkToField = (fieldName: string, fieldLabel?: string, groupName?: string) => {
    if (!editor) {
      console.warn('Editor not available for linking field')
      return
    }
    
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)
    const displayText = selectedText || fieldLabel || fieldName
    
    console.log(`Linking field "${fieldName}" with display text "${displayText}" at position ${from}-${to}`)
    
    // Utiliser un placeholder qui sera remplacé lors de la génération du PDF
    // Le placeholder sera remplacé par la valeur réelle lors de la génération avec Puppeteer
    // Pour les champs de groupes: {{bon.values.groupName.fieldName}}
    const placeholder = groupName ? `{{bon.values.${groupName}.${fieldName}}}` : `{{bon.values.${fieldName}}}`
    // Afficher le placeholder dans l'éditeur pour que l'utilisateur voie où la valeur sera placée
    const spanHTML = `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${placeholder}</span>`
    console.log('Inserting HTML with placeholder:', spanHTML)
    
    // Utiliser insertContent avec parseOptions pour préserver les attributs data-*
        const insertOptions = {
          parseOptions: {
            preserveWhitespace: 'full' as const,
          },
        }
    
    // Si du texte est sélectionné, le remplacer par le champ lié
    // Sinon, insérer le champ à la position du curseur
    if (from !== to && selectedText.trim()) {
      // Remplacer le texte sélectionné par le champ lié
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(spanHTML, insertOptions)
        .run()
    } else {
      // Insérer le champ avec data-binding à la position actuelle du curseur
      editor.chain()
        .focus()
        .insertContent(spanHTML, insertOptions)
        .run()
    }
    
    // Vérifier immédiatement après l'insertion
    setTimeout(() => {
      const htmlAfter = editor.getHTML()
      console.log('HTML after insertion:', htmlAfter)
      console.log('Contains data-binding:', htmlAfter.includes('data-binding'))
      console.log('Contains field name:', htmlAfter.includes(fieldName))
      
      // Vérifier dans le DOM
      const editorElement = editor.view.dom
      const spansAfter = editorElement.querySelectorAll('span[data-binding]')
      console.log('Spans with data-binding in DOM after insertion:', spansAfter.length)
      
      if (spansAfter.length === 0 && htmlAfter.includes('data-binding')) {
        console.error('WARNING: data-binding found in HTML but not in DOM - Tiptap may be filtering it!')
      }
    }, 100)
    setShowDataBinding(false)
  }

  // Fonction pour insérer un emplacement de signature
  const handleInsertSignature = (order?: number) => {
    if (!editor) return
    
    const placeholder = order ? `{{signature_${order}}}` : '{{signatures}}'
    const displayText = order ? `Signature ${order}` : 'Signatures'
    const spanHTML = `<span style="background-color: #dbeafe; padding: 4px 8px; border-radius: 4px; font-weight: 500; border: 1px dashed #3b82f6;">${displayText} (${placeholder})</span>`
    
    editor.chain()
      .focus()
      .insertContent(spanHTML, {
        parseOptions: {
          preserveWhitespace: 'full' as const,
        },
      })
      .run()
  }

  // Gestion du drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current
    if (data?.type === 'field' || data?.type === 'group-field' || data?.type === 'signature') {
      setActiveField(data.field || data)
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
      const data = active.data.current
      if (data?.type === 'field') {
        // Champ simple
        const field = data.field
        setTimeout(() => {
          if (!editor) return
          editor.commands.focus()
          handleLinkToField(field.name, field.label)
        }, 10)
      } else if (data?.type === 'group-field') {
        // Champ de groupe
        const field = data.field
        const groupName = data.groupName
        setTimeout(() => {
          if (!editor) return
          editor.commands.focus()
          handleLinkToField(field.name, field.label, groupName)
        }, 10)
      } else if (data?.type === 'signature') {
        // Emplacement de signature
        const order = data.order
        setTimeout(() => {
          if (!editor) return
          editor.commands.focus()
          handleInsertSignature(order)
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
            {showFieldsPalette && (bonType?.fields && bonType.fields.length > 0 || bonType?.fieldGroups && bonType.fieldGroups.length > 0) && (
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
                </div>
                
                <div className="p-2 space-y-3">
                  {/* Champs simples (sans groupe) */}
                  {bonType.fields && bonType.fields.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Champs simples</h4>
                      <div className="space-y-1">
                        {bonType.fields.filter(f => !f.bonFieldGroupId).map((field) => (
                          <DraggableField key={field.id} field={field} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groupes de champs */}
                  {bonType.fieldGroups && bonType.fieldGroups.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Groupes de champs</h4>
                      <div className="space-y-2">
                        {bonType.fieldGroups
                          .sort((a, b) => a.order - b.order)
                          .map((group) => (
                            <div
                              key={group.id}
                              className="rounded-md border bg-card overflow-hidden"
                            >
                              {/* En-tête du groupe */}
                              <div className="p-2 bg-muted/50 border-b">
                                <div className="flex items-center gap-2">
                                  {group.isRepeatable ? (
                                    <Grid3x3 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  ) : (
                                    <Layers className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{group.label}</p>
                                    {group.description && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                                    )}
                                  </div>
                                  <Badge variant={group.isRepeatable ? "default" : "secondary"} className="text-xs h-5">
                                    {group.isRepeatable ? "Répétable" : "Simple"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Champs du groupe - maintenant draggable individuellement */}
                              {group.fields && group.fields.length > 0 && (
                                <div className="p-2 space-y-1">
                                  {group.fields
                                    .sort((a, b) => a.order - b.order)
                                    .map((field) => (
                                      <DraggableGroupField
                                        key={field.id}
                                        field={field}
                                        groupName={group.name}
                                        groupLabel={group.label}
                                        isRepeatable={group.isRepeatable}
                                      />
                                    ))}
                                </div>
                              )}
                              
                              {/* Action */}
                              <div className="p-2 border-t bg-muted/30">
                                {group.isRepeatable ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs w-full"
                                    onClick={() => handleInsertRepeatableGroup(group)}
                                  >
                                    <TableIcon className="h-3 w-3 mr-1.5" />
                                    Insérer comme tableau
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs w-full"
                                    onClick={() => handleInsertSimpleGroup(group)}
                                  >
                                    <Layers className="h-3 w-3 mr-1.5" />
                                    Insérer le groupe
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Section Signatures */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Emplacements de signature</h4>
                    <div className="space-y-1">
                      {/* Emplacement générique pour toutes les signatures */}
                      <DraggableSignature 
                        label="Toutes les signatures"
                        placeholder="signatures"
                        order={undefined}
                      />
                      {/* Emplacements spécifiques par ordre (1, 2, 3, etc.) */}
                      {[1, 2, 3, 4, 5].map((order) => (
                        <DraggableSignature
                          key={order}
                          label={`Signature ${order}`}
                          placeholder={`signature_${order}`}
                          order={order}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 px-2">
                      Glissez-déposez pour placer un emplacement de signature dans le template
                    </p>
                  </div>
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
