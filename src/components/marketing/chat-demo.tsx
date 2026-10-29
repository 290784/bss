"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";

/**
 * Conversa de exemplo no cartão "Lembretes" (tela do celular da cliente): o lembrete chega,
 * a cliente confirma, a profissional agradece e oferece outro serviço, e a cliente aceita — nessa
 * hora desce a notificação do app Gê para a profissional, com o aumento e o total do atendimento.
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

// Ritmo de leitura calmo: "digitando…" proporcional ao tamanho da mensagem e, depois de cada uma,
// tempo para ler (~25 caracteres por segundo, mínimo de 1,6 s).
const digitar = (m: Msg) => Math.min(2600, 1000 + m.texto.length * 16);
const ler = (m: Msg) => Math.max(1600, m.texto.length * 40);
const FIM = 6000; // segura a conversa completa antes de recomeçar
/** Mensagem em que a cliente aceita a oferta: a notificação da Gê desce logo depois dela. */
const ACEITE = 4;
const VALORES = { servico: 70, adicional: 90 }; // exemplo: sobrancelha + lash lifting
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

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
    if (!digitando) t = setTimeout(() => setDigitando(true), passo === 0 ? 700 : ler(CONVERSA[passo - 1]!));
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
  const notificou = n > ACEITE;

  return (
    <div ref={ref} className="neon-lilas relative overflow-hidden rounded-[22px] border border-line bg-surface"
      role="img" aria-label={`Exemplo de conversa: a cliente confirma o horário, a profissional agradece e oferece um lash lifting, a cliente aceita e a Gê avisa: aumento de ${brl(VALORES.adicional)}, total de ${brl(VALORES.servico + VALORES.adicional)}.`}>
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
      </div>
      {/* Notificação do app Gê para a profissional, descendo do topo como no celular */}
      <div aria-hidden className={cn("absolute inset-x-2 top-2 z-10 flex items-start gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_18px_40px_-18px_rgb(79_18_131/0.55),0_0_0_1px_rgb(213_158_250/0.35),0_0_18px_-4px_rgb(192_110_247/0.45)] backdrop-blur transition-all duration-500 ease-out",
        notificou && !saindo ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0")}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#8b3fc6,#4f1283)] font-script text-[22px] leading-none text-white">Gê</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between text-[11px] text-muted"><span className="font-semibold tracking-wide uppercase">Gê</span>agora</span>
          <span className="mt-0.5 block text-[14px] leading-snug font-semibold text-ink">Ana confirmou o lash lifting! 🎉</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
            Aumento de <b className="text-gold-700">+{brl(VALORES.adicional)}</b> · total do atendimento <b className="text-ink">{brl(VALORES.servico + VALORES.adicional)}</b>
          </span>
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
