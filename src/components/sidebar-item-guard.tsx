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
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions()

  // Super admin voit tout
  if (isSuperAdmin()) {
    return <>{children}</>
  }

  // Vérifier les permissions
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
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
