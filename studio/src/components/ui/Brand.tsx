import { studio } from "@/data/studio";
import { cn } from "@/lib/cn";

/** Logo: arquivo do studio, se houver; senão monograma + nome na fonte de assinatura do BSS. */
export function Logo({ tamanho = "md", claro, className }: { tamanho?: "sm" | "md" | "lg"; claro?: boolean; className?: string }) {
  const { logo, nome, monograma, simbolo } = studio.marca;
  if (logo) return <img src={logo.src} alt={logo.alt} className={cn(tamanho === "lg" ? "h-24" : tamanho === "md" ? "h-12" : "h-9", "w-auto", className)} />;
  const box = tamanho === "lg" ? "h-16 w-16 text-[22px] sm:h-20 sm:w-20 sm:text-[28px]" : tamanho === "md" ? "h-12 w-12 text-[18px]" : "h-9 w-9 text-[13px]";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span aria-hidden className={cn("bg-marca grid shrink-0 place-items-center rounded-2xl font-titulo font-extrabold tracking-tight leading-none text-sobre-marca shadow-card ring-1 ring-sobre-marca/20", box)}>
        {simbolo
          ? <span className="h-[72%] w-[72%] bg-current" style={{ mask: `url(${simbolo.src}) center / contain no-repeat`, WebkitMask: `url(${simbolo.src}) center / contain no-repeat` }} />
          : monograma}
      </span>
      <span className={cn("font-assinatura leading-none whitespace-nowrap", tamanho === "lg" ? "text-[36px] sm:text-[44px]" : tamanho === "md" ? "text-[30px]" : "text-[24px]", claro ? "text-sobre-marca" : "text-primaria-texto")}>{nome.replace(/^Studio /, "")}</span>
      <span className="sr-only">{nome}</span>
    </span>
  );
}

/** Brilhos cintilantes do BSS (decorativos). */
export function Sparkles({ className }: { className?: string }) {
  // Nas bordas, longe do texto.
  const pontos: [number, number, number, number][] = [[4, 10, 10, 0], [90, 8, 7, 1.2], [95, 46, 9, 2.4], [80, 88, 6, 3.1], [52, 6, 6, 0.6]];
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {pontos.map(([x, y, s, d], i) => (
        <svg key={i} viewBox="0 0 10 10" width={s} height={s} className="absolute text-sobre-marca-suave" style={{ left: `${x}%`, top: `${y}%`, animation: `cintilar 4.6s ease-in-out ${d}s infinite` }}>
          <path d="M5 0 C5.6 4.4 5.6 4.4 10 5 C5.6 5.6 5.6 5.6 5 10 C4.4 5.6 4.4 5.6 0 5 C4.4 4.4 4.4 4.4 5 0 Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

/** Imagem com aviso visível quando é provisória. */
export function Foto({ src, alt, placeholder, className, selo = true }: { src: string; alt: string; placeholder?: boolean; className?: string; selo?: boolean }) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      {placeholder && selo && <span className="absolute bottom-2 left-2 rounded-full bg-fundo/80 px-2 py-0.5 text-xs font-semibold text-alerta">Foto provisória</span>}
    </span>
  );
}
