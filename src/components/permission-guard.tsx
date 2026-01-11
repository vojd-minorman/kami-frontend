"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  documentTypeId?: string
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Composant de protection qui vérifie les permissions de l'utilisateur
 * Utilise le backend pour vérifier les permissions (plus fiable)
 */
export function PermissionGuard({ 
  children, 
  permission, 
  permissions, 
  requireAll = false,
  documentTypeId,
  fallback,
  redirectTo = "/dashboard"
}: PermissionGuardProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  // Vérifier les permissions via le backend
  useEffect(() => {
    if (authLoading || !user) {
      setHasAccess(null)
      return
    }

    const checkPermission = async () => {
      setChecking(true)
      try {
        const result = await api.checkPermission({
          permission,
          permissions,
          documentTypeId,
          requireAll,
        })
        setHasAccess(result.hasAccess)
      } catch (error: any) {
        // Si erreur 401/403, pas d'accès
        if (error?.status === 401 || error?.status === 403) {
          setHasAccess(false)
        } else {
          // Autre erreur, on considère qu'on n'a pas accès par sécurité
          console.error('Error checking permission:', error)
          setHasAccess(false)
        }
      } finally {
        setChecking(false)
      }
    }

    checkPermission()
  }, [user, authLoading, permission, permissions, documentTypeId, requireAll])

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Redirection si pas d'accès avec toast
  useEffect(() => {
    if (!authLoading && !checking && user && hasAccess === false) {
      toast({
        variant: "destructive",
        title: "Accès refusé",
        description: permission 
          ? `Vous n'avez pas la permission "${permission}" pour accéder à cette page.`
          : permissions && permissions.length > 0
          ? `Vous n'avez pas les permissions nécessaires pour accéder à cette page.`
          : "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
      })
      router.push(redirectTo)
    }
  }, [authLoading, checking, user, hasAccess, redirectTo, router, permission, permissions])

  // Afficher le loading pendant le chargement OU si on vérifie les permissions
  if (authLoading || checking || hasAccess === null) {
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

  // Si pas d'utilisateur, ne rien afficher (redirection gérée par useEffect)
  if (!user) {
    return null
  }

  // Si pas d'accès, ne rien afficher (toast et redirection gérés par useEffect)
  if (hasAccess === false) {
    return null
  }

  // Accès autorisé
  return <>{children}</>
}
