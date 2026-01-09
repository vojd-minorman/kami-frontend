"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api, type User } from "@/lib/api"

interface UseAuthReturn {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

      if (!token) {
        // Pas de token, nettoyer et rediriger vers login
        setUser(null)
        if (typeof window !== "undefined") {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/login")
        }
        setLoading(false)
        return
      }

      // Récupérer l'utilisateur depuis l'API
      const userData = await api.getMe()
      console.log('[useAuth] Données utilisateur reçues:', userData)
      console.log('[useAuth] Rôles de l\'utilisateur:', userData.roles)
      setUser(userData)

      // Mettre à jour localStorage avec les données fraîches
      localStorage.setItem("user", JSON.stringify(userData))
    } catch (error) {
      // Si erreur (401, token invalide, etc.), nettoyer et rediriger
      setUser(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/login")
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      // Même en cas d'erreur, on se déconnecte localement
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/login")
      }
      setUser(null)
    }
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return {
    user,
    loading,
    logout,
    refreshUser,
  }
}

