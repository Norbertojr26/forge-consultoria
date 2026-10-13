import type { Metadata } from "next";
import { Archivo_Black, Doto, Inter, JetBrains_Mono } from "next/font/google";
import { ptBR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fonte matricial (pontos) para os números de destaque do painel
const doto = Doto({
  variable: "--font-doto",
  weight: ["700", "900"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FORGE Consultoria",
  description: "Consultoria de treino e dieta com acompanhamento semanal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${archivoBlack.variable} ${inter.variable} ${jetbrainsMono.variable} ${doto.variable}`}
      >
        <ClerkProvider
          localization={ptBR}
          appearance={{
            variables: {
              colorPrimary: "#ff5b14",
              colorBackground: "#111113",
              colorForeground: "#ffffff",
              colorInput: "#16161a",
              colorInputForeground: "#ffffff",
              colorNeutral: "#d4d4dc",
              borderRadius: "0.25rem",
            },
          }}
        >
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
