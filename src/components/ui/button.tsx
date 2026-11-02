import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "btn-glow text-white",
  secondary: "bg-surface text-ink border border-line shadow-[var(--shadow-control)] hover:border-accent-muted hover:bg-accent-subtle/40",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
  subtle: "bg-accent-subtle text-accent-text hover:bg-accent-muted",
  danger: "bg-surface text-danger border border-danger-border hover:bg-st-noshow-bg",
};
const sizes: Record<Size, string> = {
  sm: "h-10 sm:h-8 px-3 text-[13px] gap-1.5 rounded-[10px]", // 40 px no celular (toque), 32 px no computador
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-control)]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-[14px]",
  icon: "h-10 w-10 rounded-[var(--radius-control)] justify-center",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant], sizes[size], className,
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
