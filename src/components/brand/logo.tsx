import Link from "next/link";
import { cn } from "@/lib/cn";
import { GeEscrito } from "./ge-escrito";

/**
 * Logo: só o "Gê" cursivo, escrito à mão ao abrir a página (ver ge-escrito.tsx).
 * "script" é a versão da landing creme, maior e em roxo; a padrão acompanha o tema do app.
 */
export function Logo({ href = "/", className, variant = "tile" }: { href?: string; className?: string; variant?: "tile" | "script" }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="Gê — início">
      <span className={cn("leading-none", variant === "script" ? "text-[48px] text-violet-700" : "text-[38px] text-violet-100 light:text-violet-700")}><GeEscrito /></span>
    </Link>
  );
}
