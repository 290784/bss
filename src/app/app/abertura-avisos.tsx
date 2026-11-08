"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CalendarClock, Gift, Package, TrendingUp } from "lucide-react";

export type AvisoAbertura = { id: string; kind: "confirmar" | "faturamento" | "estoque" | "mimos" | "avisos" | "atencao"; title: string; detail?: string; value?: string; href: string; cta: string };

const ICON = { confirmar: CalendarClock, faturamento: TrendingUp, estoque: Package, mimos: Gift, avisos: Bell, atencao: AlertTriangle };
const CHAVE = "ge-abertura-vista";

/**
 * Abertura do painel, uma vez por visita: uma entrada curta com a marca e o "Oi, nome" sobre fundo de vidro escuro
 * e, em seguida, uma folha que sobe de baixo com os avisos do dia para ela (confirmações pendentes, dicas urgentes
 * e pontos de atenção), cada um com o botão certo. Toque em qualquer lugar da entrada para pular; "Agora não"
 * ou o fundo fecham. Quem pede "reduzir movimento" vê só a folha, sem a entrada. Sem avisos, não aparece.
 */
export function AberturaAvisos({ name, dateLabel, items }: { name: string; dateLabel: string; items: AvisoAbertura[] }) {
  const router = useRouter();
  const [fase, setFase] = useState<"off" | "entrada" | "folha">("off");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!items.length) return;
    try { if (sessionStorage.getItem(CHAVE)) return; sessionStorage.setItem(CHAVE, "1"); } catch { /* sem armazenamento: mostra */ }
    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = setTimeout(() => {
      setFase(calmo ? "folha" : "entrada");
      if (!calmo) timer.current = setTimeout(() => setFase("folha"), 2300);
    }, 0);
    return () => { clearTimeout(t0); clearTimeout(timer.current); };
  }, [items.length]);

  useEffect(() => {
    if (fase !== "folha") return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFase("off"); };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [fase]);

  if (fase === "off") return null;
  const primeiro = items[0]!;
  const abrir = (href: string) => { setFase("off"); router.push(href); };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Avisos do dia">
      {fase === "entrada" ? (
        <button type="button" aria-label="Pular abertura" onClick={() => { clearTimeout(timer.current); setFase("folha"); }}
          className="absolute inset-0 grid place-items-center overflow-hidden bg-[#1d0a19] text-center" style={{ animation: "ab-fade-out 0.5s ease-in 1.85s forwards" }}>
          <span aria-hidden className="absolute -left-24 top-[12%] h-72 w-72 rounded-full bg-[#7a2d63] opacity-60 blur-3xl" style={{ animation: "ab-orb 6s ease-in-out infinite" }} />
          <span aria-hidden className="absolute -right-20 bottom-[10%] h-80 w-80 rounded-full bg-[#c6a05b] opacity-30 blur-3xl" style={{ animation: "ab-orb 7s ease-in-out infinite reverse" }} />
          <span className="relative">
            <span className="ab-rise block font-[family-name:var(--font-allura)] text-[120px] leading-none text-[#e3c88f]">Gê</span>
            <span className="ab-rise mt-2 block font-serif text-3xl font-semibold text-[#fbf5ec]" style={{ animationDelay: "0.35s" }}>Oi, {name}</span>
            <span className="ab-rise mt-2 block text-sm text-white/65 first-letter:uppercase" style={{ animationDelay: "0.6s" }}>{dateLabel}</span>
          </span>
        </button>
      ) : (
        <>
          <button type="button" aria-label="Fechar avisos" onClick={() => setFase("off")} className="absolute inset-0 bg-[#12060f]/55 backdrop-blur-sm" style={{ animation: "ab-scrim 0.4s ease both" }} />
          <div className="ab-sheet ab-glass absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-[28px] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-white">
            <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/35" />
            <h2 className="font-serif text-[22px] font-semibold leading-tight">{items.length === 1 ? "Um aviso pra você hoje" : `${items.length} avisos pra você hoje`}, {name}</h2>
            <p className="mt-1 text-[13px] text-white/65">Só o que vale a sua atenção agora.</p>
            <ul className="mt-4 grid gap-2.5">
              {items.map((a, i) => {
                const Icon = ICON[a.kind];
                return (
                  <li key={a.id} className="ab-card ab-glass-card flex items-start gap-3 rounded-2xl p-3.5" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e3c88f]/20 text-[#e3c88f]"><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-snug">{a.title}{a.value && <span className="ml-1.5 text-[#e3c88f]">{a.value}</span>}</span>
                      {a.detail && <span className="mt-0.5 block text-[13px] leading-snug text-white/65">{a.detail}</span>}
                      <button type="button" onClick={() => abrir(a.href)} className="mt-2 rounded-full border border-[#e3c88f]/50 px-3 py-1 text-[13px] font-semibold text-[#e3c88f]">{a.cta}</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid gap-2.5">
              <button type="button" onClick={() => abrir(primeiro.href)} className="rounded-full bg-[#e3c88f] px-5 py-3 text-[15px] font-bold text-[#2a0d22]">{primeiro.cta}</button>
              <button type="button" onClick={() => setFase("off")} className="rounded-full border border-white/25 px-5 py-3 text-[15px] font-semibold text-white">Agora não</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
