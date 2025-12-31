import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kami Operation - Plateforme de Bons Numériques",
  description: "Plateforme configurable de bons numériques et d'autorisations minières",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
