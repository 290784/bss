"use client";
import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

export type QuickMessage = { id: string; label: string; text: string };

/** Mensagens prontas para a cliente: escolhe, ajusta se quiser e manda no WhatsApp (ou copia). */
export function QuickMessages({ phone, messages, highlight }: { phone: string | null; messages: QuickMessage[]; highlight?: string }) {
  const toast = useToast();
  const [sel, setSel] = useState(highlight && messages.some((m) => m.id === highlight) ? highlight : messages[0]?.id);
  const current = messages.find((m) => m.id === sel) ?? messages[0];
  const [text, setText] = useState(current?.text ?? "");
  if (!current) return null;
  const pick = (m: QuickMessage) => { setSel(m.id); setText(m.text); };
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">Mandar uma mensagem</h2>
      <p className="mt-0.5 text-xs text-muted">Escolha um modelo, ajuste do seu jeito e envie.</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Modelos de mensagem">
        {messages.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={m.id === sel} onClick={() => pick(m)}
            className={cn("h-9 rounded-full border px-3 text-[13px] font-medium transition sm:h-8",
              m.id === sel ? "border-transparent bg-accent text-white" : "border-line bg-surface text-ink-soft hover:text-ink")}>
            {m.label}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} aria-label="Texto da mensagem"
        className="mt-3 w-full resize-y rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm leading-relaxed focus:border-accent focus:ring-2 focus:ring-accent-muted focus:outline-none" />
      <div className="mt-2 flex flex-wrap gap-2">
        {phone && (
          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm")}>
            <MessageCircle className="h-4 w-4" />Enviar no WhatsApp
          </a>
        )}
        <Button size="sm" variant="secondary" onClick={async () => { if (await copyText(text)) toast("Mensagem copiada! 💌"); else window.prompt("Copie a mensagem:", text); }}>
          <Copy className="h-4 w-4" />Copiar
        </Button>
      </div>
      {!phone && <p className="mt-2 text-xs text-muted">Ela não tem WhatsApp cadastrado: copie e mande por onde preferir.</p>}
    </Card>
  );
}
