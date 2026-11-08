import type { Metadata, Viewport } from "next";
import { Allura, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { TouchActive } from "@/components/ui/touch-active";

// Nunito (texto e interface: arredondada, macia e legível), Playfair Display (títulos do app e da landing:
// serifada elegante, de revista) e Allura (cursiva do nome "Gê"). As duas primeiras são variáveis (todos os pesos).
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Gê — gestão de beleza que brilha", template: "%s · Gê" },
  description: "Agenda, clientes, agendamento online e indicadores para profissionais e negócios de beleza. Menos tempo administrando, menos horários perdidos e mais clientes voltando.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  applicationName: "Gê",
  appleWebApp: { capable: true, title: "Gê", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: "#f6f3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" className={`${nunito.variable} ${playfair.variable} ${allura.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh"><TouchActive /><PwaRegister />{children}</body>
    </html>
  );
}
