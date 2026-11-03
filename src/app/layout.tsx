import type { Metadata, Viewport } from "next";
import { Allura, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { TouchActive } from "@/components/ui/touch-active";
import { THEME_BOOT_SCRIPT } from "@/components/theme/theme";

// Nunito (texto e interface: arredondada, macia e legível), Playfair Display (títulos do app e da landing:
// serifada elegante, de revista) e Allura (cursiva do nome "Gê"). As duas primeiras são variáveis (todos os pesos).
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Gê — gestão de beleza que brilha", template: "%s · Gê" },
  description: "Agenda, clientes, agendamento online e indicadores para profissionais e negócios de beleza. Menos tempo administrando, menos horários perdidos e mais clientes voltando.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: "#f6f3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${playfair.variable} ${allura.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body className="min-h-dvh"><TouchActive />{children}</body>
    </html>
  );
}
