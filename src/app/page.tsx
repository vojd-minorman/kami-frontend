'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté en vérifiant le token dans localStorage
    const token = localStorage.getItem('token')
    
    if (token) {
      // Utilisateur connecté, rediriger vers le dashboard
      router.push('/dashboard')
    } else {
      // Utilisateur non connecté, rediriger vers la page de login
      router.push('/login')
    }
  }, [router])

  // Afficher un loader pendant la vérification
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )
}
