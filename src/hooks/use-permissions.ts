'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { api } from '@/lib/api'

interface Permission {
  id: string
  code: string
  name: string
  resource?: string
  action: string
  documentTypeId?: string
}

export function usePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadPermissions()
    } else {
      setPermissions([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      // Récupérer les permissions de l'utilisateur via ses rôles
      if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        const allPermissions: Permission[] = []
        const permissionMap = new Map<string, Permission>()

        for (const role of user.roles) {
          // Vérifier si le rôle a la propriété code
          const roleCode = role.code || role.name?.toLowerCase().replace(/\s+/g, '_')
          
          if (role.permissions && Array.isArray(role.permissions)) {
            for (const perm of role.permissions) {
              if (!permissionMap.has(perm.id)) {
                permissionMap.set(perm.id, perm)
                allPermissions.push(perm)
              }
            }
          }
        }

        setPermissions(allPermissions)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permissionCode: string, documentTypeId?: string): boolean => {
    if (!user) return false
    
    // Super admin ou admin ont toutes les permissions
    const isSuperAdmin = user.roles?.some((r: any) => {
      const roleCode = r.code || r.name?.toLowerCase().replace(/\s+/g, '_')
      return roleCode === 'super_admin' || roleCode === 'admin' || roleCode === 'administrateur'
    })
    if (isSuperAdmin) {
      return true
    }

    return permissions.some((perm) => {
      if (perm.code === permissionCode) {
        // Si documentTypeId est fourni, vérifier que la permission correspond
        if (documentTypeId && perm.documentTypeId) {
          return perm.documentTypeId === documentTypeId
        }
        // Permission générale ou permission spécifique (si documentTypeId fourni)
        return !perm.documentTypeId || !documentTypeId
      }
      return false
    })
  }

  const hasAnyPermission = (permissionCodes: string[], documentTypeId?: string): boolean => {
    return permissionCodes.some((code) => hasPermission(code, documentTypeId))
  }

  const hasAllPermissions = (permissionCodes: string[], documentTypeId?: string): boolean => {
    return permissionCodes.every((code) => hasPermission(code, documentTypeId))
  }

  const hasRole = (roleCode: string): boolean => {
    if (!user) {
      return false
    }
    
    if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      return false
    }
    
    return user.roles.some((r: any) => {
      const rCode = r.code || r.name?.toLowerCase().replace(/\s+/g, '_')
      return (rCode === roleCode || rCode === roleCode.toLowerCase()) && (r.isActive !== false)
    })
  }

  const isSuperAdmin = (userToCheck?: typeof user): boolean => {
    // Utiliser le user passé en paramètre ou celui du hook
    const userToUse = userToCheck ?? user
    
    if (!userToUse) {
      return false
    }
    
    if (!userToUse.roles || !Array.isArray(userToUse.roles) || userToUse.roles.length === 0) {
      return false
    }
    
    // Vérifier directement dans les rôles
    return userToUse.roles.some((r: any) => {
      const rCode = r.code || r.name?.toLowerCase().replace(/\s+/g, '_')
      return (rCode === 'super_admin' || rCode === 'admin' || rCode === 'administrateur') && (r.isActive !== false)
    })
  }

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSuperAdmin,
    reload: loadPermissions,
  }
}
