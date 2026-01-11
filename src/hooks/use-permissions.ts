"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface UsePermissionsReturn {
  hasPermission: (permission: string, documentTypeId?: string) => boolean | null
  hasAnyPermission: (permissions: string[], documentTypeId?: string) => boolean | null
  hasAllPermissions: (permissions: string[], documentTypeId?: string) => boolean | null
  isSuperAdmin: () => boolean
  checking: boolean
  userPermissions: string[] | null
}

export function usePermissions(): UsePermissionsReturn {
  const { user, loading } = useAuth()
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (loading || !user) {
      setUserPermissions(null)
      return
    }

    // Pour l'instant, on retourne null car on vérifie via le backend
    // On pourrait charger les permissions depuis l'utilisateur si disponibles
    setUserPermissions(null)
  }, [user, loading])

  const checkPermission = async (
    permission: string,
    documentTypeId?: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const result = await api.checkPermission({
        permission,
        documentTypeId,
        requireAll: false,
      })
      return result.hasAccess
    } catch (error) {
      console.error("Error checking permission:", error)
      return false
    }
  }

  const hasPermission = (permission: string, documentTypeId?: string): boolean | null => {
    // Pour l'instant, on retourne null pour forcer la vérification côté backend
    // Dans un vrai système, on pourrait vérifier localement si les permissions sont chargées
    return null
  }

  const hasAnyPermission = (
    permissions: string[],
    documentTypeId?: string
  ): boolean | null => {
    return null
  }

  const hasAllPermissions = (
    permissions: string[],
    documentTypeId?: string
  ): boolean | null => {
    return null
  }

  const isSuperAdmin = (): boolean => {
    if (!user) return false
    // Vérifier si l'utilisateur a le rôle super_admin
    // Le rôle peut être dans user.role (string) ou user.roles (array)
    if (user.role === 'super_admin') return true
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some((role: any) => 
        (typeof role === 'string' && role === 'super_admin') ||
        (typeof role === 'object' && (role.code === 'super_admin' || role.name === 'super_admin'))
      )
    }
    return false
  }

  // S'assurer que toutes les fonctions sont définies et exportées correctement
  const returnValue: UsePermissionsReturn = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    checking,
    userPermissions,
  }

  // Vérification de sécurité en développement
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (typeof returnValue.isSuperAdmin !== 'function') {
      console.error('[usePermissions] isSuperAdmin is not a function:', typeof returnValue.isSuperAdmin)
    }
  }

  return returnValue
}
