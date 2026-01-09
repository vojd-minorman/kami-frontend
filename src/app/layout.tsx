import type React from "react"
import type { Metadata } from "next"
// import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { LocaleProvider } from "@/contexts/locale-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kas Mining",
  description: "Plateforme de Documents Numériques",
  generator: "wonorogo.com",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
