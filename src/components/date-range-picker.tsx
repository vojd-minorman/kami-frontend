'use client'

import * as React from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  dateFrom?: string
  dateTo?: string
  onDateFromChange: (date: string | undefined) => void
  onDateToChange: (date: string | undefined) => void
  className?: string
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
}: DateRangePickerProps) {
  const handleClear = () => {
    onDateFromChange(undefined)
    onDateToChange(undefined)
  }

  const hasDates = dateFrom || dateTo

  return (
    <div className={cn('space-y-2 w-full', className)}>
      <Label className="text-sm font-medium">Du / Au</Label>
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Input
              id="date-from"
              type="date"
              value={dateFrom || ''}
              onChange={(e) => onDateFromChange(e.target.value || undefined)}
              className="pr-8 w-full h-10 text-xs sm:text-sm"
              placeholder="Du"
            />
            <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none flex-shrink-0" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Input
              id="date-to"
              type="date"
              value={dateTo || ''}
              onChange={(e) => onDateToChange(e.target.value || undefined)}
              min={dateFrom || undefined}
              className="pr-8 w-full h-10 text-xs sm:text-sm"
              placeholder="Au"
            />
            <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none flex-shrink-0" />
          </div>
        </div>
        {hasDates && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={handleClear}
            title="Effacer les dates"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
