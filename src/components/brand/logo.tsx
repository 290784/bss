import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Monograma: placa ameixa arredondada com o "G" cursivo em dourado. Animado: um brilho dourado
 * percorre o "G", um reflexo de luz cruza a placa e uma estrelinha pisca no canto; inclina de leve
 * ao passar o mouse. Com "reduzir movimento", fica parado (regra global de animações).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("logo-mark relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] [--mark:32px]", className)} aria-hidden>
      <span className="logo-g translate-x-[1px] translate-y-[3px] font-script leading-none [font-size:calc(var(--mark)*0.82)]">G</span>
      <svg viewBox="0 0 10 10" className="logo-spark absolute top-[12%] right-[12%] h-[26%] w-[26%]">
        <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

/** "script": versão da landing creme — placa maior e "Gê" cursivo em ameixa. */
export function Logo({ href = "/", className, variant = "tile" }: { href?: string; className?: string; variant?: "tile" | "script" }) {
  if (variant === "script")
    return (
      <Link href={href} className={cn("logo group inline-flex items-center gap-2.5", className)} aria-label="Gê — início">
        <LogoMark className="h-11 w-11 rounded-[14px] [--mark:44px]" />
        <span className="translate-y-[3px] font-script text-[40px] leading-none whitespace-nowrap text-violet-700">Gê</span>
      </Link>
    );
  return (
    <Link href={href} className={cn("logo group inline-flex items-center gap-2", className)} aria-label="Gê — início">
      <LogoMark />
      <span className="translate-y-[2px] font-script text-[34px] leading-none whitespace-nowrap text-violet-100 light:text-violet-700">Gê</span>
    </Link>
  );
}
