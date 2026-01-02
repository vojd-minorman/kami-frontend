'use client'

import { Header } from './header'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}



