"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Quanto tempo a saudação do dia fica no título antes de voltar para "Oii, nome". */
export const GREETING_VISIBLE_MS = 20_000;
/** Digitar o nome: um pouco mais devagar que apagar, para dar o ritmo de máquina de escrever. */
const TYPE_MS = 75;
/** Apagar a saudação leva cerca de 1,4 s, seja qual for o tamanho da frase. */
const ERASE_TOTAL_MS = 1400;
const PAUSE_MS = 280;
const CARET_LINGER_MS = 1200;

/**
 * Título do painel: a saudação do dia aparece quando ela abre a página e, depois de 20 segundos, as letras
 * são apagadas uma a uma e "Oii, nome" é digitado, como numa máquina de escrever (com cursor piscando).
 * Cada vez que o painel é aberto, a contagem recomeça. A frase em si (a do dia, gravada no banco) vem pronta
 * do servidor. Com "reduzir movimento" ligado, a troca é direta, sem animação.
 */
export function GreetingTitle({ greeting, name }: { greeting: string; name: string }) {
  const [text, setText] = useState(greeting);
  const [phase, setPhase] = useState<"greeting" | "erasing" | "typing" | "done">("greeting");
  const [caret, setCaret] = useState(false);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const final = Array.from(`Oii, ${name}`); // por letra (não separa o emoji ao meio)
    const old = Array.from(greeting);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setText(final.join("")); setPhase("done"); return; }
      setMinHeight(box.current?.offsetHeight); // segura a altura enquanto digita: o resto da página não pula
      setCaret(true); setPhase("erasing");
      const step = Math.min(45, Math.max(14, ERASE_TOTAL_MS / old.length));
      let i = old.length;
      const erase = () => {
        i--; setText(old.slice(0, i).join(""));
        if (i > 0) return later(erase, step);
        later(() => { setPhase("typing"); type(); }, PAUSE_MS);
      };
      let j = 0;
      const type = () => {
        j++; setText(final.slice(0, j).join(""));
        if (j < final.length) return later(type, TYPE_MS);
        setPhase("done");
        later(() => { setCaret(false); setMinHeight(0); }, CARET_LINGER_MS);
      };
      later(erase, step);
    };

    later(start, GREETING_VISIBLE_MS);
    return () => timers.forEach(clearTimeout);
  }, [greeting, name]);

  // A saudação tem letra menor (frase longa); o "Oii, nome" volta ao tamanho dos títulos das outras páginas.
  const isGreetingSize = phase === "greeting" || phase === "erasing";
  return (
    <span ref={box} className="block transition-[min-height] duration-500" style={{ minHeight }}>
      <span className={cn(isGreetingSize && "block max-w-[22em] text-[24px] leading-[1.2] text-balance sm:text-[30px]")}>
        {text}
        {caret && <span aria-hidden className="tw-caret" />}
      </span>
    </span>
  );
}
