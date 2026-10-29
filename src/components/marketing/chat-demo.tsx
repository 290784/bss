"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion, useInView } from "./motion";
import { GeEscrito } from "@/components/brand/ge-escrito";

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
/** Horário de cada mensagem, como aparece no WhatsApp. */
const HORAS = ["09:12", "09:14", "09:14", "09:15", "09:17", "09:17"];
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
    <div ref={ref} className="neon-lilas relative overflow-hidden rounded-[22px] border border-line bg-[#efeae2]"
      role="img" aria-label={`Exemplo de conversa: a cliente confirma o horário, a profissional agradece e oferece um lash lifting, a cliente aceita e a Gê avisa: seu cliente adicionou um novo serviço ao agendamento, valor adicional de ${brl(VALORES.adicional)}, total do atendimento ${brl(VALORES.servico + VALORES.adicional)}.`}>
      {/* Conversa nas cores padrão do WhatsApp; as cores da Gê ficam só na notificação do app. */}
      <div aria-hidden className="flex items-center gap-2.5 bg-[#008069] px-4 py-2.5 text-white">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dfe5e7] text-[15px] font-semibold text-[#54656f]">J</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">Ju · Lash &amp; Sobrancelha</span>
          <span className="block text-[12px] text-white/80">{quem === "pro" ? "digitando…" : "online"}</span>
        </span>
      </div>
      <div aria-hidden className={cn("flex h-[300px] flex-col justify-end gap-2 overflow-hidden px-3 py-3 transition-opacity duration-400 [mask-image:linear-gradient(to_bottom,transparent,black_18%)] sm:h-[320px]", saindo ? "opacity-0" : "opacity-100")}>
        {CONVERSA.slice(0, n).map((m, i) => (
          <Bolha key={i} m={m} hora={HORAS[i]!} ultima={i === n - 1 && !reduced} />
        ))}
        {quem && <Digitando de={quem} />}
      </div>
      {/* Notificação do app Gê para a profissional, no tamanho de uma notificação do iPhone:
          ícone pequeno, nome + "Agora mesmo" numa linha e no máximo duas linhas de texto
          (corta com "…"), com o upsell e os valores em destaque. Desce com um leve quique. */}
      <div aria-hidden className={cn("absolute inset-x-1.5 top-1.5 z-10 flex items-center gap-2.5 rounded-[18px] bg-[rgb(246_245_248/0.88)] px-2.5 py-2 shadow-[0_10px_26px_-12px_rgb(40_20_60/0.45),0_0_0_0.5px_rgb(0_0_0/0.06)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-[650ms] ease-[cubic-bezier(.2,1.25,.4,1)]",
        notificou && !saindo ? "translate-y-0 scale-100 opacity-100" : "-translate-y-[140%] scale-95 opacity-0")}>
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,#8b3fc6,#6c1fa8_50%,#4f1283)] text-[20px] leading-none text-white">
          {/* Remonta ao aparecer, para o "Gê" se escrever junto com a notificação */}
          <GeEscrito key={notificou ? "on" : "off"} />
        </span>
        <span className="min-w-0 flex-1 text-[#1c1c1e]">
          <span className="flex items-baseline justify-between gap-2 leading-tight">
            <span className="truncate text-[13px] font-semibold">Gê</span>
            <span className="shrink-0 text-[11px] text-[#8a8a8e]">Agora mesmo</span>
          </span>
          <span className="line-clamp-2 text-[12.5px] leading-[1.3]">
            Ana adicionou <b className="font-semibold">Lash lifting</b>! <b className="font-semibold whitespace-nowrap text-[#2f7d4f]">+{brl(VALORES.adicional)}</b> · 💰 total <b className="font-semibold whitespace-nowrap">{brl(VALORES.servico + VALORES.adicional)}</b>
          </span>
        </span>
      </div>
    </div>
  );
}

function Bolha({ m, hora, ultima }: { m: Msg; hora: string; ultima: boolean }) {
  const pro = m.de === "pro";
  return (
    <span className={cn("relative max-w-[85%] shrink-0 rounded-lg px-2.5 pt-1.5 pb-1 text-[14px] leading-snug text-[#111b21] shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]",
      pro ? "self-start rounded-tl-none bg-white" : "self-end rounded-tr-none bg-[#d9fdd3]",
      ultima && "motion-safe:[animation:mkt-rise_.35s_ease-out]")}>
      {m.texto}
      <span className="float-right ml-2 translate-y-1.5 text-[11px] leading-none text-[#667781]">
        {hora}{!pro && <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 align-[-3px] text-[#53bdeb]" />}
      </span>
    </span>
  );
}

function Digitando({ de }: { de: "pro" | "cliente" }) {
  return (
    <span className={cn("inline-flex shrink-0 gap-1 rounded-lg px-3 py-2.5 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]", de === "pro" ? "self-start rounded-tl-none bg-white" : "self-end rounded-tr-none bg-[#d9fdd3]")}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#8696a0] motion-safe:[animation:chat-dot_1s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
