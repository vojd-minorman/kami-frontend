"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type TranslationKeys } from "@/lib/translations"

type Locale = "fr" | "en"

type Translations = TranslationKeys

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr")

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale | null
    if (savedLocale && (savedLocale === "fr" || savedLocale === "en")) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  const value = {
    locale,
    setLocale,
    t: translations[locale] as Translations,
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
