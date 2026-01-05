'use client'

import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
// import { Toolbar } from './toolbar' // TODO: Create toolbar component
import { useDrop } from 'react-dnd'
import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface EditorContentProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function EditorContentArea({ 
  content, 
  onChange, 
  placeholder = 'Commencez à écrire...',
  className 
}: EditorContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] p-6 max-w-none',
      },
    },
  })

  const dropRef = useRef<HTMLDivElement>(null)
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'pdf-element',
    drop: (item: { elementType: string }) => {
      // Gérer l'ajout d'éléments via drag & drop
      if (editor && item.elementType === 'text') {
        editor.chain().focus().insertContent('<p>Nouveau texte</p>').run()
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current)
    }
  }, [drop])

  if (!editor) {
    return null
  }

  return (
    <div 
      ref={dropRef}
      className={cn(
        'flex flex-col border rounded-lg bg-background overflow-hidden',
        isOver && 'ring-2 ring-primary ring-offset-2',
        className
      )}
    >
      {/* <Toolbar editor={editor} /> */}
      <div className="flex-1 overflow-auto">
        <TiptapEditorContent editor={editor} />
      </div>
    </div>
  )
}

