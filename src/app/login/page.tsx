"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useLocale } from "@/contexts/locale-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleToggle } from "@/components/locale-toggle"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // TODO: Implémenter l'appel API
      const response = await fetch("http://localhost:3333/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error(t.auth.invalidCredentials)
      }

      const data = await response.json()

      // Stocker le token
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      // Rediriger vers le dashboard
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || t.auth.loginError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)] opacity-20" />

      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float-delayed" />

      {/* Theme and Language Toggles */}
      <div className="fixed top-6 right-6 flex gap-3 z-50">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md mx-4 relative z-10 border-border/50 backdrop-blur-sm bg-card/95 shadow-2xl animate-fade-in-up">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 duration-300">
                <span className="text-primary-foreground font-bold text-3xl">K</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.auth.login}</h1>
            <p className="text-muted-foreground text-sm">Kami Operation - Plateforme de Bons Numériques</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg animate-shake backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`transition-colors duration-200 ${focusedField === "email" ? "text-primary" : "text-foreground"}`}
              >
                {t.auth.email}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  className="h-12 px-4 transition-all duration-200 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div
                  className={`absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ${focusedField === "email" ? "w-full" : "w-0"}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={`transition-colors duration-200 ${focusedField === "password" ? "text-primary" : "text-foreground"}`}
              >
                {t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  className="h-12 px-4 transition-all duration-200 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div
                  className={`absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ${focusedField === "password" ? "w-full" : "w-0"}`}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t.common.loading}
                </div>
              ) : (
                t.auth.loginButton
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              Mot de passe oublié ?
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-muted-foreground">
        © 2026 Kami Operation. Tous droits réservés.
      </div>
    </div>
  )
}
