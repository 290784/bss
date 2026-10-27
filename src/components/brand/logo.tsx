import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#5a2647" />
      <path d="M10 22.5V9.5h6.2c2.7 0 4.3 1.3 4.3 3.4 0 1.4-.8 2.4-2 2.8 1.6.3 2.6 1.5 2.6 3.1 0 2.3-1.8 3.7-4.6 3.7H10Z" fill="none" stroke="#f6ebe1" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="23.5" cy="9" r="1.6" fill="#e6c9ae" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Beauty OS — início">
      <LogoMark />
      <span className="font-display text-[19px] font-medium tracking-[-0.01em] text-ink">Beauty OS</span>
    </Link>
  );
}
