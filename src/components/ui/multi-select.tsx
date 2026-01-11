'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  label: string
  value: string | number
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  placeholder?: string
  className?: string
  maxCount?: number // Nombre max d'options à afficher dans le trigger
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Sélectionner...',
  className,
  maxCount = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleUnselect = (item: string | number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(selected.filter((s) => s !== item))
  }

  const handleSelect = (value: string | number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectedOptions = options.filter((opt) => selected.includes(opt.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between min-h-10 h-auto px-2 sm:px-3', className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap flex-1 min-w-0 mr-2">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm truncate">{placeholder}</span>
            ) : selected.length <= maxCount ? (
              selectedOptions.map((option) => (
                <Badge
                  variant="secondary"
                  key={option.value}
                  className="mr-1 mb-1 max-w-full text-xs"
                  onClick={(e) => handleUnselect(option.value, e)}
                >
                  <span className="truncate max-w-[120px] sm:max-w-none">{option.label}</span>
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(option.value, e as any)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => handleUnselect(option.value, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <>
                {selectedOptions.slice(0, maxCount).map((option) => (
                  <Badge
                    variant="secondary"
                    key={option.value}
                    className="mr-1 mb-1 max-w-full text-xs"
                  >
                    <span className="truncate max-w-[100px] sm:max-w-none">{option.label}</span>
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnselect(option.value, e as any)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => handleUnselect(option.value, e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                <Badge variant="secondary" className="mr-1 mb-1 text-xs whitespace-nowrap">
                  +{selected.length - maxCount} autre(s)
                </Badge>
              </>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
        <div className="max-h-60 overflow-auto p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <div
                key={option.value}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-accent'
                )}
                onClick={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 flex-shrink-0',
                    isSelected ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="truncate">{option.label}</span>
              </div>
            )
          })}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Aucune option disponible
            </div>
          )}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs w-full sm:w-auto"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange([])
              }}
            >
              Tout désélectionner
            </Button>
            <span className="text-xs text-muted-foreground text-center sm:text-right whitespace-nowrap">
              {selected.length} sélectionné(s)
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
