"use client"

import type { ReactNode } from "react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="w-full max-w-[1800px] mx-auto min-w-0">
      {children}
    </div>
  )
}










