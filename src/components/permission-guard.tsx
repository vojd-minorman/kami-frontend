"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"

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
 * Version simplifiée inspirée de SidebarItemGuard
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
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin, loading: permissionsLoading } = usePermissions()

  // Calculer hasAccess seulement quand tout est chargé
  let hasAccess: boolean | null = null // null = en attente, true/false = décidé

  // Ne calculer hasAccess que si tout est chargé
  if (!authLoading && !permissionsLoading) {
    if (!user) {
      hasAccess = false
    } else {
      // Super admin a accès à tout - VÉRIFICATION PRIORITAIRE
      // Passer user explicitement pour éviter les problèmes de timing
      const isAdmin = isSuperAdmin(user)
      
      if (isAdmin) {
        hasAccess = true
      } else {
        // Vérifier les permissions seulement si pas admin
        if (permission) {
          hasAccess = hasPermission(permission, documentTypeId)
        } else if (permissions && permissions.length > 0) {
          hasAccess = requireAll
            ? hasAllPermissions(permissions, documentTypeId)
            : hasAnyPermission(permissions, documentTypeId)
        } else {
          // Si aucune permission spécifiée, autoriser l'accès
          hasAccess = true
        }
      }
    }
  }

  // TOUS les hooks doivent être appelés AVANT tous les returns conditionnels
  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !permissionsLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, permissionsLoading, router])

  // Redirection si pas d'accès avec toast
  useEffect(() => {
    // Ne rediriger que si on a fini de charger ET qu'on est sûr qu'il n'y a pas accès
    // IMPORTANT: Ne pas appeler isSuperAdmin() si user n'est pas encore chargé
    // On se base uniquement sur hasAccess qui a déjà été calculé correctement
    if (authLoading || permissionsLoading || !user || hasAccess === null || hasAccess === true) {
      // Ne rien faire si on est en train de charger, pas d'utilisateur, ou accès autorisé
      return
    }
    
    // Si on arrive ici, hasAccess === false et tout est chargé
    // On vérifie une dernière fois qu'on n'est pas admin (sécurité supplémentaire)
    // Passer user explicitement pour éviter les problèmes de timing
    const isAdmin = isSuperAdmin(user)
    
    if (!isAdmin && redirectTo) {
      // Afficher un toast pour informer l'utilisateur
      toast({
        variant: "destructive",
        title: "Accès refusé",
        description: permission 
          ? `Vous n'avez pas la permission "${permission}" pour accéder à cette page.`
          : permissions && permissions.length > 0
          ? `Vous n'avez pas les permissions nécessaires pour accéder à cette page.`
          : "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
      })
      
      // Rediriger immédiatement
      router.push(redirectTo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, permissionsLoading, user, hasAccess, redirectTo, router, permission, permissions])

  // MAINTENANT on peut faire les returns conditionnels
  // Afficher le loading pendant le chargement OU si on n'a pas encore déterminé l'accès
  if (authLoading || permissionsLoading || hasAccess === null) {
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

  // Si pas d'utilisateur, ne rien afficher
  if (!user) {
    return null
  }

  // Super admin a accès à tout - vérification prioritaire (comme dans SidebarItemGuard)
  // DOUBLE VÉRIFICATION pour être sûr
  // Passer user explicitement pour éviter les problèmes de timing
  const isAdmin = isSuperAdmin(user)
  
  if (isAdmin) {
    return <>{children}</>
  }

  // Si pas d'accès ET qu'on n'est pas admin, ne rien afficher (le toast et la redirection sont gérés par le useEffect)
  if (hasAccess === false) {
    // Double vérification : si on est admin, on ne devrait jamais arriver ici
    // Passer user explicitement pour éviter les problèmes de timing
    if (isSuperAdmin(user)) {
      return <>{children}</>
    }
    return null
  }

  // Accès autorisé
  return <>{children}</>
}
