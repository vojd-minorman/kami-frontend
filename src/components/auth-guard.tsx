"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Composant de protection qui redirige vers /login si l'utilisateur n'est pas authentifié
 * Utilisé pour protéger les pages qui ne passent pas par le layout dashboard
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      // Redirection explicite si pas d'utilisateur après le chargement
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md p-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )
    )
  }

  if (!user) {
    // Pendant la redirection, ne rien afficher
    return null
  }

  return <>{children}</>
}










