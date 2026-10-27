"use client";
import { useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Card com brilho que acompanha o mouse ou o dedo (luz suave sob o ponteiro).
 * Funciona no toque: o brilho aparece onde a pessoa encosta e acompanha o arraste.
 */
export function GlowCard({ className, children, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
    el.style.setProperty("--go", "1");
  };
  const leave = () => ref.current?.style.setProperty("--go", "0");
  return (
    <div ref={ref} onPointerMove={move} onPointerDown={move} onPointerLeave={leave} onPointerUp={(e) => { if (e.pointerType !== "mouse") leave(); }}
      className={cn("glow-hover relative isolate overflow-hidden [-webkit-tap-highlight-color:transparent]", className)} {...props}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
        style={{ opacity: "var(--go, 0)", background: "radial-gradient(260px circle at var(--gx, 50%) var(--gy, 50%), rgb(192 110 247 / 0.22), transparent 70%)" }} />
      {children}
    </div>
  );
}
