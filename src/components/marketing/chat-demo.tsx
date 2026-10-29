"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";

/**
 * Conversa de exemplo no cartão "Lembretes" (tela do celular da cliente): o lembrete chega,
 * a cliente confirma, a profissional agradece e oferece outro serviço, e a cliente aceita.
 * Roda como um vídeo em looping, com "digitando…" antes de cada mensagem; só anima com o cartão
 * na tela. Com "reduzir movimento", mostra a conversa inteira parada.
 */
type Msg = { de: "pro" | "cliente"; texto: string };

const CONVERSA: Msg[] = [
  { de: "pro", texto: "Oii, Ana! 😊 Tudo bem? Passando pra lembrar: amanhã às 14:30 tem sobrancelha comigo 💜" },
  { de: "cliente", texto: "Oiee, Ju! Confirmadíssimo, tô lá 🙌" },
  { de: "pro", texto: "Aaah, obrigada, linda! Já tô te esperando ✨" },
  { de: "pro", texto: "Ah, e já que você vem… bora fazer um lash lifting junto? Fica um arraso com a sobrancelha nova 😍 Consigo encaixar logo depois" },
  { de: "cliente", texto: "Amiga, você me conhece né 😂 Bora!!" },
  { de: "pro", texto: "Fechou! Já deixei reservadinho pra você 💅" },
];

// Tempo do "digitando…" proporcional ao tamanho da mensagem; pausa de leitura depois de cada uma.
const digitar = (m: Msg) => Math.min(1700, 600 + m.texto.length * 12);
const LEITURA = 1100;
const FIM = 3600; // segura a conversa completa antes de recomeçar

export function ChatDemo() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  // passo: quantas mensagens já apareceram; "digitando" indica quem está escrevendo a próxima.
  const [passo, setPasso] = useState(0);
  const [digitando, setDigitando] = useState(false);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (reduced || !inView) return;
    let t: ReturnType<typeof setTimeout>;
    if (passo >= CONVERSA.length) {
      t = setTimeout(() => setSaindo(true), FIM);
      return () => clearTimeout(t);
    }
    if (!digitando) t = setTimeout(() => setDigitando(true), passo === 0 ? 500 : LEITURA);
    else t = setTimeout(() => { setDigitando(false); setPasso((p) => p + 1); }, digitar(CONVERSA[passo]!));
    return () => clearTimeout(t);
  }, [passo, digitando, reduced, inView]);

  useEffect(() => {
    if (!saindo) return;
    const t = setTimeout(() => { setPasso(0); setDigitando(false); setSaindo(false); }, 450);
    return () => clearTimeout(t);
  }, [saindo]);

  const n = reduced ? CONVERSA.length : passo;
  const quem = !reduced && digitando ? CONVERSA[passo]?.de : undefined;
  const fechou = n >= CONVERSA.length - 1;

  return (
    <div ref={ref} className="neon-lilas overflow-hidden rounded-[22px] border border-line bg-surface"
      role="img" aria-label="Exemplo de conversa: a cliente confirma o horário, a profissional agradece e oferece um lash lifting, e a cliente aceita.">
      <div aria-hidden className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#8b3fc6,#4f1283)] font-script text-[22px] leading-none text-gold-300">J</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">Ju · Lash &amp; Sobrancelha</span>
          <span className="block text-[12px] text-success">{quem === "pro" ? "digitando…" : "online"}</span>
        </span>
      </div>
      <div aria-hidden className={cn("flex h-[300px] flex-col justify-end gap-2 overflow-hidden px-3 py-3 transition-opacity duration-400 [mask-image:linear-gradient(to_bottom,transparent,black_18%)] sm:h-[320px]", saindo ? "opacity-0" : "opacity-100")}>
        {CONVERSA.slice(0, n).map((m, i) => (
          <Bolha key={i} m={m} ultima={i === n - 1 && !reduced} />
        ))}
        {quem && <Digitando de={quem} />}
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 self-center rounded-full border border-gold-300 bg-gold-50 px-3 py-1 text-[12px] font-semibold text-gold-700 transition-all duration-500",
          fechou ? "scale-100 opacity-100" : "pointer-events-none h-0 scale-75 overflow-hidden py-0 opacity-0")}>
          <Sparkles className="h-3.5 w-3.5" />Lash lifting adicionado · ticket +R$ 90
        </span>
      </div>
    </div>
  );
}

function Bolha({ m, ultima }: { m: Msg; ultima: boolean }) {
  const pro = m.de === "pro";
  return (
    <span className={cn("max-w-[85%] shrink-0 px-3.5 py-2 text-[14px] leading-snug", pro
      ? "self-start rounded-2xl rounded-bl-md bg-sunken text-ink ring-1 ring-line"
      : "btn-glow self-end rounded-2xl rounded-br-md text-white",
      ultima && "motion-safe:[animation:mkt-rise_.35s_ease-out]")}>
      {m.texto}
      {!pro && <CheckCheck className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-violet-100" />}
    </span>
  );
}

function Digitando({ de }: { de: "pro" | "cliente" }) {
  return (
    <span className={cn("inline-flex shrink-0 gap-1 rounded-2xl px-3.5 py-3", de === "pro" ? "self-start rounded-bl-md bg-sunken ring-1 ring-line" : "btn-glow self-end rounded-br-md")}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full motion-safe:[animation:chat-dot_1s_ease-in-out_infinite]", de === "pro" ? "bg-muted" : "bg-white/80")} style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
