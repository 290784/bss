"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, Bell, CalendarCheck2, ChevronDown, HeartHandshake, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";

/**
 * Carrossel do hero: cada card mostra um recurso real do produto em forma de ilustração
 * (esqueletos no lugar de dados). Um dock de ícones em arco troca o card; cada card tem
 * um halo de cor próprio. Avança sozinho, pausa com o mouse em cima, fora da tela ou
 * com "reduzir movimento".
 */

type Slide = { key: string; label: string; icon: typeof Bell; tile: string; glyph: string; halo: string; render: () => ReactNode };

const SLIDES: Slide[] = [
  { key: "lembretes", label: "Lembretes", icon: Bell, tile: "bg-[#efe6ff]", glyph: "text-[#813afc]", halo: "var(--color-halo-lavender)", render: () => <RemindersCard /> },
  { key: "online", label: "Agendamento online", icon: CalendarCheck2, tile: "bg-[#fff1d6]", glyph: "text-[#e08a00]", halo: "var(--color-halo-orange)", render: () => <OnlineCard /> },
  { key: "receita", label: "Faturamento", icon: BarChart3, tile: "bg-[#ffe3ee]", glyph: "text-[#e0457b]", halo: "var(--color-halo-pink)", render: () => <RevenueCard /> },
  { key: "retorno", label: "Clientes de volta", icon: HeartHandshake, tile: "bg-[#dcf8e8]", glyph: "text-[#13a85a]", halo: "var(--color-halo-green)", render: () => <ReturnCard /> },
  { key: "promo", label: "Promoções", icon: Tag, tile: "bg-[#dff4fb]", glyph: "text-[#1a8fc0]", halo: "var(--color-halo-cyan)", render: () => <PromoCard /> },
];

const DWELL_MS = 2600;
const STEP = 70; // distância entre ícones do dock

export function HeroWidget() {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const playing = !reduced && !hover && inView;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % SLIDES.length), DWELL_MS);
    return () => clearTimeout(t);
  }, [playing, active]);

  const slide = SLIDES[active]!;
  return (
    <div ref={ref} className="relative mx-auto aspect-[66/73] w-full max-w-[560px] select-none"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      role="region" aria-roledescription="carrossel" aria-label="Recursos do Beauty OS">
      {/* Halo desfocado com a cor do card ativo */}
      <div className="absolute inset-[8%] rounded-full opacity-90 blur-3xl transition-[background-color] duration-700" style={{ backgroundColor: slide.halo }} aria-hidden />
      {/* Contorno em arco atrás da pilha */}
      <svg className="absolute inset-x-[6%] top-[4%] h-[70%] w-[88%] text-ink-warm/10" viewBox="0 0 100 80" fill="none" aria-hidden preserveAspectRatio="none">
        <path d="M4 80 V40 a46 38 0 0 1 92 0 V80" stroke="currentColor" strokeWidth="0.4" />
      </svg>

      <div className="absolute inset-x-[9%] top-[8%] bottom-[36%] sm:top-[10%] sm:bottom-[30%]" aria-live="polite">
        <div key={slide.key} className="absolute inset-0 flex items-center justify-center motion-safe:[animation:mkt-card-in_.45s_cubic-bezier(.2,.8,.2,1)]">
          {slide.render()}
        </div>
      </div>

      {/* Dock em arco */}
      <div className="absolute inset-x-0 bottom-[6%] h-28 overflow-hidden sm:bottom-[7%] sm:h-32">
        <div className="absolute top-0 left-1/2 h-full">
          {SLIDES.map((s, i) => {
            let offset = i - active;
            if (offset > 2) offset -= SLIDES.length;
            if (offset < -2) offset += SLIDES.length;
            const dist = Math.abs(offset);
            const size = dist === 0 ? 77 : dist === 1 ? 58 : 50;
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActive(i)} aria-label={s.label} aria-pressed={dist === 0}
                className={cn("absolute top-1/2 grid place-items-center rounded-[22px] bg-white shadow-[0_8px_24px_-10px_rgba(21,16,11,.35)] transition-all duration-500 ease-out",
                  dist === 2 && "opacity-45")}
                style={{ width: size, height: size, transform: `translate(calc(${offset * STEP}px - 50%), calc(-50% + ${dist * dist * 5}px))`, zIndex: 10 - dist }}>
                <span className={cn("grid place-items-center rounded-[16px] transition-all duration-500", s.tile)} style={{ width: size - 14, height: size - 14 }}>
                  <Icon className={cn(s.glyph)} style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2.2} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-[2%] left-1/2 flex -translate-x-1/2 flex-col items-center text-[#c9b8f0]" aria-hidden>
        {[0, 1, 2].map((i) => <ChevronDown key={i} className="-mt-2 h-4 w-4 first:mt-0 motion-safe:[animation:mkt-chevron_1.6s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
      <p className="sr-only">Recurso em destaque: {slide.label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards (ilustrações: barras cinza no lugar de texto, sem dados reais)

const Sk = ({ className }: { className?: string }) => <span className={cn("block rounded-full bg-[#e7e5e2]", className)} />;
const Panel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-[18px] bg-white shadow-[0_18px_40px_-18px_rgba(21,16,11,.35),0_2px_6px_rgba(21,16,11,.06)]", className)}>{children}</div>
);

function RemindersCard() {
  return (
    <div className="flex w-[78%] flex-col gap-3">
      <Panel className="relative flex items-center gap-3 p-3">
        <div className="grid h-12 w-12 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
          {["#f5c7b8", "#cfc3f5", "#bfe7d3", "#f4dc9c"].map((c) => <span key={c} style={{ background: c }} />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink-warm">3 lembretes hoje</div>
          <Sk className="mt-1.5 h-2 w-24" />
        </div>
        <span className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-badge text-xs font-bold text-white">1</span>
      </Panel>
      <Panel className="flex items-center gap-3 p-3 opacity-90">
        <span className="h-12 w-12 shrink-0 rounded-xl bg-[#f1efec]" />
        <div className="flex-1"><Sk className="h-2.5 w-28" /><Sk className="mt-2 h-2 w-16" /></div>
      </Panel>
      <Panel className="flex items-center justify-center p-3 text-2xl font-light text-ink-warm/40">+</Panel>
    </div>
  );
}

function OnlineCard() {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <div className="relative w-[82%]">
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between"><Sk className="h-2.5 w-24" /><Sk className="h-2.5 w-10" /></div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-ink-warm/40">
          {days.map((d, i) => <span key={i}>{d}</span>)}
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={cn("grid aspect-square place-items-center rounded-lg text-[11px]",
              i === 9 ? "bg-ink-warm text-white" : i % 5 === 3 ? "bg-[#f1efec] text-ink-warm/30 line-through" : "bg-[#f7f6f4] text-ink-warm/70")}>{i + 3}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-1.5">
          {["09:00", "10:30", "14:30"].map((t, i) => (
            <span key={t} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold tabular", i === 2 ? "bg-ink-warm text-white" : "bg-[#f1efec] text-ink-warm/70")}>{t}</span>
          ))}
        </div>
      </Panel>
      <span className="absolute -top-4 -right-3 rounded-lg bg-sticker px-3 py-1.5 text-[15px] font-extrabold text-ink-warm shadow-md [transform:rotate(-16deg)] motion-safe:[animation:mkt-sticker_.5s_cubic-bezier(.3,1.5,.5,1)_.15s_both]">
        Confirmado!
      </span>
    </div>
  );
}

function Bars({ values, gradients, cap = true }: { values: number[]; gradients: string[]; cap?: boolean }) {
  return (
    <div className="relative flex h-32 items-end gap-2.5">
      <span className="absolute inset-x-0 top-[38%] border-t border-dashed border-ink-warm/20" aria-hidden />
      {values.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col justify-end">
          {cap && <span className="mb-1 h-1 rounded-full bg-[#ebe9e6]" />}
          <span className="block origin-bottom rounded-t-[6px] rounded-b-[3px] motion-safe:[animation:mkt-bar_.7s_cubic-bezier(.2,.8,.2,1)_both]"
            style={{ height: `${v}%`, background: gradients[i % gradients.length], animationDelay: `${0.05 * i}s` }} />
        </div>
      ))}
    </div>
  );
}

function RevenueCard() {
  return (
    <Panel className="w-[82%] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div><div className="text-[15px] font-bold text-ink-warm">Recebido no mês</div><Sk className="mt-1.5 h-2 w-20" /></div>
        <span className="text-ink-warm/30">›</span>
      </div>
      <Bars values={[46, 62, 38, 80, 58, 92]}
        gradients={["linear-gradient(#f7e15c,#9be15d)", "linear-gradient(#7bc8ff,#f58bd0)", "linear-gradient(#ffb36b,#ff6fa3)"]} />
    </Panel>
  );
}

function ReturnCard() {
  return (
    <Panel className="w-[82%] p-4">
      <div className="mb-4"><div className="text-[15px] font-bold text-ink-warm/80">Clientes que voltaram</div><Sk className="mt-1.5 h-2 w-24" /></div>
      <Bars cap={false} values={[30, 44, 52, 61, 74, 88]} gradients={["linear-gradient(var(--color-bar-green-to),var(--color-bar-green-from))"]} />
    </Panel>
  );
}

function PromoCard() {
  return (
    <div className="relative h-[86%] w-[80%]">
      <Panel className="absolute top-[10%] right-0 flex h-[70%] w-[62%] flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur">
        <span className="h-10 w-10 rounded-full bg-[#ebe9e6]" />
        <span className="text-[26px] font-bold text-ink-warm/30">20%</span>
      </Panel>
      <Panel className="absolute top-0 left-0 h-full w-[64%] overflow-hidden">
        <div className="relative h-[72%] bg-[radial-gradient(circle_at_30%_30%,#ffd9e6,#c9b8f0_55%,#9fd8f2)]">
          <span className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-ink-warm text-[11px] font-bold text-white">B·</span>
          <span className="absolute right-3 bottom-2 text-[28px] font-bold text-white drop-shadow">15%</span>
        </div>
        <div className="p-3"><Sk className="h-2.5 w-24" /><Sk className="mt-2 h-2 w-14" /></div>
      </Panel>
    </div>
  );
}
