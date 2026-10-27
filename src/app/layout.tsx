import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";

// DM Sans (texto) e Inter Tight (títulos) — ver docs/design/referencia-hero-bento.md. Fraunces só no logotipo.
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-inter-tight", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Beauty OS — gestão inteligente para beleza e estética", template: "%s · Beauty OS" },
  description: "Agenda, clientes, agendamento online e indicadores para profissionais e negócios de beleza. Menos tempo administrando, menos horários perdidos e mais clientes voltando.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${interTight.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
