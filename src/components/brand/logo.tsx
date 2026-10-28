import Link from "next/link";
import { cn } from "@/lib/cn";

/** Monograma: "G" cursivo sobre o degradê Royal Violet, com contorno fino e um brilho. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("bg-royal ring-glass relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] shadow-[0_0_18px_-4px_rgb(171_61_245/0.7)]", className)} aria-hidden>
      <span className="translate-x-[1px] translate-y-[3px] font-script text-[26px] leading-none text-violet-100">G</span>
      <svg viewBox="0 0 10 10" className="absolute top-[3px] right-[3px] h-[9px] w-[9px] text-white">
        <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

/** "script": versão da landing creme — "G" cursivo em violeta com brilho dourado, sem a placa. */
export function Logo({ href = "/", className, variant = "tile" }: { href?: string; className?: string; variant?: "tile" | "script" }) {
  if (variant === "script")
    return (
      <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Gê — início">
        <span aria-hidden className="relative">
          <span className="text-ge block translate-y-[3px] pr-1 font-script text-[40px] leading-none">G</span>
          <svg viewBox="0 0 10 10" className="absolute -top-0.5 -right-1 h-[10px] w-[10px] text-gold-400">
            <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0Z" fill="currentColor" />
          </svg>
        </span>
        <span aria-hidden className="h-7 w-px bg-line-strong" />
        <span className="translate-y-[2px] font-script text-[36px] leading-none whitespace-nowrap text-ink">Gê</span>
      </Link>
    );
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Gê — início">
      <LogoMark />
      <span className="translate-y-[2px] font-script text-[34px] leading-none whitespace-nowrap text-violet-100 light:text-violet-700">Gê</span>
    </Link>
  );
}
