import type { Metadata, Viewport } from "next";
import { Allura, DM_Sans, Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/components/theme/theme";

// DM Sans (texto e interface), Fraunces (títulos do app: serifada calorosa, de caderno), Inter Tight (títulos da landing)
// e Allura (cursiva do nome "Gê").
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-inter-tight", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces", display: "swap" });
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
    <html lang="pt-BR" className={`${dmSans.variable} ${interTight.variable} ${fraunces.variable} ${allura.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
