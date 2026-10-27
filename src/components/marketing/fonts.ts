import { DM_Sans, Inter_Tight } from "next/font/google";

/** Vozes tipográficas da landing (ver docs/design/referencia-hero-bento.md). */
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
export const interTight = Inter_Tight({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-inter-tight", display: "swap" });
