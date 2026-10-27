"use client";
import { useCallback, useRef, type ReactNode } from "react";
import { BarChart3, Bell, CalendarCheck2, HeartHandshake, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";
import { StoryBars, useAutoplay, useSwipe } from "./carousel";

/**
 * Carrossel do hero: cada card mostra um recurso real do produto em forma de ilustração
 * (esqueletos no lugar de dados), com uma legenda curta para ler. Avança sozinho em ritmo
 * de leitura (~5 s por card); pausa com o mouse em cima, com o botão de pausa, fora da tela
 * e por 12 s depois de qualquer toque. Troca por clique no card, no dock, nas barras,
 * arrastando o dedo para os lados ou pelas setas do teclado.
 */

type Slide = { key: string; label: string; desc: string; icon: typeof Bell; tile: string; glyph: string; halo: string; render: () => ReactNode };

const SLIDES: Slide[] = [
  { key: "lembretes", label: "Lembretes", desc: "Confirmação e lembrete 24h antes, sem mandar uma a uma.", icon: Bell, tile: "bg-[#eacffc]", glyph: "text-[#5a0891]", halo: "var(--color-halo-lavender)", render: () => <RemindersCard /> },
  { key: "online", label: "Agendamento online", desc: "Sua cliente escolhe um horário livre, a qualquer hora.", icon: CalendarCheck2, tile: "bg-[#d59efa]", glyph: "text-[#3c0561]", halo: "var(--color-halo-orange)", render: () => <OnlineCard /> },
  { key: "receita", label: "Faturamento", desc: "Quanto você recebeu no mês, dia a dia.", icon: BarChart3, tile: "bg-[#c06ef7]", glyph: "text-[#ffffff]", halo: "var(--color-halo-pink)", render: () => <RevenueCard /> },
  { key: "retorno", label: "Clientes de volta", desc: "Quem voltou e quem precisa de um convite para voltar.", icon: HeartHandshake, tile: "bg-[#ab3df5]", glyph: "text-[#ffffff]", halo: "var(--color-halo-green)", render: () => <ReturnCard /> },
  { key: "promo", label: "Promoções", desc: "Ofertas para preencher horários vagos.", icon: Tag, tile: "bg-[#960df2]", glyph: "text-[#ffffff]", halo: "var(--color-halo-cyan)", render: () => <PromoCard /> },
];

/** Tempo de cada card: o suficiente para ler o título e a legenda com calma. */
const DURATIONS = SLIDES.map(() => 5200);
const STEP = 70; // distância entre ícones do dock

export function HeroWidget() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const auto = useAutoplay({ count: SLIDES.length, durations: DURATIONS, active: !reduced && inView });
  const wasSwipe = useSwipe(stageRef, auto.next, auto.prev);
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); auto.next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); auto.prev(); }
  }, [auto]);

  const active = auto.index;
  const slide = SLIDES[active]!;
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[560px] select-none" {...auto.hoverProps}
      role="region" aria-roledescription="carrossel" aria-label="Recursos da Gê" tabIndex={0} onKeyDown={onKey}
      onPointerDown={auto.hold}>
      <StoryBars className="relative z-20 mx-auto mb-2 max-w-[420px] px-2" count={SLIDES.length} index={active} durations={DURATIONS}
        running={auto.running} onGo={auto.go} paused={auto.userPaused || reduced} onTogglePause={auto.togglePause} labels={SLIDES.map((x) => x.label)} />

      <div className="relative aspect-[66/88] w-full sm:aspect-[66/73]">
        {/* Halo desfocado com a cor do card ativo */}
        <div className="absolute inset-[8%] rounded-full opacity-60 blur-[70px] transition-[background-color] duration-1000" style={{ backgroundColor: slide.halo }} aria-hidden />
        {/* Contorno em arco atrás da pilha */}
        <svg className="absolute inset-x-[6%] top-[4%] h-[70%] w-[88%] text-violet-200/25" viewBox="0 0 100 80" fill="none" aria-hidden preserveAspectRatio="none">
          <path d="M4 80 V40 a46 38 0 0 1 92 0 V80" stroke="currentColor" strokeWidth="0.4" />
        </svg>

        {/* Palco: clicar avança, arrastar troca */}
        <div ref={stageRef} className="absolute inset-x-[9%] top-[3%] bottom-[40%] cursor-pointer touch-pan-y sm:top-[6%] sm:bottom-[33%]"
          onClick={() => { if (!wasSwipe()) auto.next(); }} aria-live="polite">
          <div key={slide.key} className="absolute inset-0 flex items-center justify-center transition-transform duration-300 active:scale-[0.98] motion-safe:[animation:mkt-card-in_.7s_cubic-bezier(.2,.8,.2,1)]">
            {slide.render()}
          </div>
        </div>

        {/* Legenda do card: entra junto, com tempo de leitura */}
        <div className="absolute inset-x-[6%] bottom-[24%] text-center sm:bottom-[24%]">
          <p key={slide.key} className="motion-safe:[animation:mkt-rise_.6s_ease-out_.15s_both]">
            <span className="block text-[15px] font-semibold text-violet-100">{slide.label}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{slide.desc}</span>
          </p>
        </div>

        {/* Dock em arco */}
        <div className="absolute inset-x-0 bottom-[2%] h-28 overflow-hidden sm:bottom-[3%] sm:h-32">
          <div className="absolute top-0 left-1/2 h-full">
            {SLIDES.map((s, i) => {
              let offset = i - active;
              if (offset > 2) offset -= SLIDES.length;
              if (offset < -2) offset += SLIDES.length;
              const dist = Math.abs(offset);
              const size = dist === 0 ? 77 : dist === 1 ? 58 : 50;
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => auto.go(i)} aria-label={s.label} aria-pressed={dist === 0} title={s.label}
                  className={cn("group absolute top-1/2 grid place-items-center rounded-[22px] bg-[#0c0820] ring-1 ring-white/20 shadow-[0_8px_28px_-8px_rgb(150_13_242/0.7)] transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] hover:ring-violet-200/70 active:brightness-125",
                    dist === 2 && "opacity-45 hover:opacity-80")}
                  style={{ width: size, height: size, transform: `translate(calc(${offset * STEP}px - 50%), calc(-50% + ${dist * dist * 5}px))`, zIndex: 10 - dist }}>
                  <span className={cn("grid place-items-center rounded-[16px] transition-all duration-700 group-hover:scale-105 group-active:scale-90", s.tile)} style={{ width: size - 14, height: size - 14 }}>
                    <Icon className={cn(s.glyph)} style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2.2} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">Toque no card, arraste para o lado ou use as setas.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards (ilustrações: barras cinza no lugar de texto, sem dados reais)

const Sk = ({ className }: { className?: string }) => <span className={cn("block rounded-full bg-[#2d2348]", className)} />;
const Panel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("glass rounded-[20px] bg-[#120b26]/80 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.8)]", className)}>{children}</div>
);

function RemindersCard() {
  return (
    <div className="flex w-[78%] flex-col gap-3">
      <Panel className="relative flex items-center gap-3 p-3">
        <div className="grid h-12 w-12 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
          {["#eacffc", "#c06ef7", "#960df2", "#5a0891"].map((c) => <span key={c} style={{ background: c }} />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink">3 lembretes hoje</div>
          <Sk className="mt-1.5 h-2 w-24" />
        </div>
        <span className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-badge text-xs font-bold text-white">1</span>
      </Panel>
      <Panel className="flex items-center gap-3 p-3 opacity-90">
        <span className="h-12 w-12 shrink-0 rounded-xl bg-[#1d1535]" />
        <div className="flex-1"><Sk className="h-2.5 w-28" /><Sk className="mt-2 h-2 w-16" /></div>
      </Panel>
      <Panel className="flex items-center justify-center p-3 text-2xl font-light text-ink/40">+</Panel>
    </div>
  );
}

function OnlineCard() {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <div className="relative w-[82%]">
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between"><Sk className="h-2.5 w-24" /><Sk className="h-2.5 w-10" /></div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-ink/40">
          {days.map((d, i) => <span key={i}>{d}</span>)}
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={cn("grid aspect-square place-items-center rounded-lg text-[11px]",
              i === 9 ? "btn-glow text-white" : i % 5 === 3 ? "bg-[#1d1535] text-ink/30 line-through" : "bg-[#181130] text-ink/70")}>{i + 3}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-1.5">
          {["09:00", "10:30", "14:30"].map((t, i) => (
            <span key={t} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold tabular", i === 2 ? "btn-glow text-white" : "bg-[#1d1535] text-ink/70")}>{t}</span>
          ))}
        </div>
      </Panel>
      <span className="absolute -top-4 -right-3 rounded-lg bg-sticker px-3 py-1.5 text-[15px] font-extrabold text-violet-800 shadow-[0_0_24px_-4px_rgb(234_207_252/0.9)] [transform:rotate(-16deg)] motion-safe:[animation:mkt-sticker_.5s_cubic-bezier(.3,1.5,.5,1)_.15s_both]">
        Confirmado!
      </span>
    </div>
  );
}

function Bars({ values, gradients, cap = true }: { values: number[]; gradients: string[]; cap?: boolean }) {
  return (
    <div className="relative flex h-32 items-end gap-2.5">
      <span className="absolute inset-x-0 top-[38%] border-t border-dashed border-violet-300/20" aria-hidden />
      {values.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col justify-end">
          {cap && <span className="mb-1 h-1 rounded-full bg-[#2d2348]" />}
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
        <div><div className="text-[15px] font-bold text-ink">Recebido no mês</div><Sk className="mt-1.5 h-2 w-20" /></div>
        <span className="text-ink/30">›</span>
      </div>
      <Bars values={[46, 62, 38, 80, 58, 92]}
        gradients={["linear-gradient(#eacffc,#ab3df5)", "linear-gradient(#d59efa,#780ac2)", "linear-gradient(#c06ef7,#5a0891)"]} />
    </Panel>
  );
}

function ReturnCard() {
  return (
    <Panel className="w-[82%] p-4">
      <div className="mb-4"><div className="text-[15px] font-bold text-ink/80">Clientes que voltaram</div><Sk className="mt-1.5 h-2 w-24" /></div>
      <Bars cap={false} values={[30, 44, 52, 61, 74, 88]} gradients={["linear-gradient(var(--color-bar-green-to),var(--color-bar-green-from))"]} />
    </Panel>
  );
}

function PromoCard() {
  return (
    <div className="relative h-[86%] w-[80%]">
      <Panel className="absolute top-[10%] right-0 flex h-[70%] w-[62%] flex-col items-center justify-center gap-2 bg-white/5 backdrop-blur">
        <span className="h-10 w-10 rounded-full bg-[#2d2348]" />
        <span className="text-[26px] font-bold text-ink/30">20%</span>
      </Panel>
      <Panel className="absolute top-0 left-0 h-full w-[64%] overflow-hidden">
        <div className="relative h-[72%] bg-[radial-gradient(circle_at_30%_30%,#eacffc,#ab3df5_50%,#3c0561)]">
          <span className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full btn-glow text-[11px] font-bold text-white">B·</span>
          <span className="absolute right-3 bottom-2 text-[28px] font-bold text-white drop-shadow">15%</span>
        </div>
        <div className="p-3"><Sk className="h-2.5 w-24" /><Sk className="mt-2 h-2 w-14" /></div>
      </Panel>
    </div>
  );
}
