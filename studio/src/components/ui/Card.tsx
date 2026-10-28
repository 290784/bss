import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Superfície padrão do BSS: cartão com borda fina, reflexo no topo e sombra suave. */
export function Card({ className, as: Tag = "div", ...p }: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-card border border-borda bg-superficie shadow-card", className)} {...p} />;
}
