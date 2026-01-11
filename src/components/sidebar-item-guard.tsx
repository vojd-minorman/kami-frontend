"use client"

import { usePermissions } from "@/hooks/use-permissions"

interface SidebarItemGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  hideIfNoPermission?: boolean
}

/**
 * Composant qui masque/affiche les éléments du sidebar selon les permissions
 * Si hideIfNoPermission est true, l'élément est complètement masqué (pas de rendu)
 * Sinon, l'élément est rendu mais peut être désactivé visuellement
 */
export function SidebarItemGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  hideIfNoPermission = true,
}: SidebarItemGuardProps) {
  const permissionsHook = usePermissions()
  
  // Vérifier que le hook retourne bien les fonctions
  if (!permissionsHook) {
    console.error('[SidebarItemGuard] usePermissions returned undefined')
    return null
  }
  
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = permissionsHook

  // Super admin voit tout - avec vérification de sécurité
  if (isSuperAdmin && typeof isSuperAdmin === 'function') {
    try {
      if (isSuperAdmin()) {
        return <>{children}</>
      }
    } catch (error) {
      console.error('[SidebarItemGuard] Error calling isSuperAdmin:', error)
    }
  } else {
    console.warn('[SidebarItemGuard] isSuperAdmin is not a function:', typeof isSuperAdmin)
  }

  // Vérifier les permissions
  let hasAccess = false

  if (permission) {
    const result = hasPermission(permission)
    // Si null, on considère qu'on n'a pas accès par sécurité
    hasAccess = result === true
  } else if (permissions && permissions.length > 0) {
    const result = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    // Si null, on considère qu'on n'a pas accès par sécurité
    hasAccess = result === true
  } else {
    // Si aucune permission spécifiée, autoriser l'accès
    hasAccess = true
  }

  if (!hasAccess) {
    if (hideIfNoPermission) {
      return null
    }
    // Optionnel: rendre l'élément mais désactivé
    return <>{children}</>
  }

  return <>{children}</>
}
