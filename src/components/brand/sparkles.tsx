import { cn } from "@/lib/cn";

/**
 * Brilhos cintilantes decorativos (estrelas de 4 pontas). Posições fixas (sem aleatoriedade,
 * para não divergir entre servidor e cliente). Some com "reduzir movimento" via CSS global.
 */
const DEFAULT: [number, number, number, number][] = [
  // [left %, top %, tamanho px, atraso s]
  [8, 18, 10, 0], [22, 72, 7, 1.4], [38, 12, 6, 2.6], [56, 64, 9, 0.8], [71, 22, 12, 2.0],
  [84, 58, 7, 3.1], [93, 14, 8, 1.1], [64, 88, 6, 2.3], [14, 46, 5, 3.5], [47, 38, 5, 0.4],
];

export function Sparkles({ className, points = DEFAULT, color = "text-violet-100" }: { className?: string; points?: [number, number, number, number][]; color?: string }) {
  return (
    <span className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {points.map(([x, y, size, delay], i) => (
        <svg key={i} viewBox="0 0 10 10" className={cn("absolute drop-shadow-[0_0_6px_rgb(234_207_252/0.9)] motion-safe:[animation:twinkle_3.6s_ease-in-out_infinite] motion-reduce:opacity-60", color)}
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, animationDelay: `${delay}s` }}>
          <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

/** Brilho único, para pontuar títulos e botões. */
export function Sparkle({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} className={cn("inline-block text-violet-100 drop-shadow-[0_0_6px_rgb(234_207_252/0.9)]", className)} aria-hidden>
      <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0Z" fill="currentColor" />
    </svg>
  );
}
