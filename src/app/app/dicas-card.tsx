"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronDown, Copy, Gift, Lightbulb, MessageCircle, Package, RotateCcw, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { Dica, DicaKind } from "@/server/modules/dicas";

const KINDS: { id: DicaKind | "todas"; label: string; icon: typeof Lightbulb }[] = [
  { id: "todas", label: "Todas", icon: Lightbulb },
  { id: "faturamento", label: "Faturar mais", icon: TrendingUp },
  { id: "estoque", label: "Estoque", icon: Package },
  { id: "mimos", label: "Mimos", icon: Gift },
  { id: "avisos", label: "Avisos", icon: Bell },
];
const TONE: Record<DicaKind, string> = {
  faturamento: "bg-st-completed-bg text-st-completed",
  estoque: "bg-gold-50 text-gold-700",
  mimos: "bg-accent-subtle text-accent-text",
  avisos: "bg-st-pending-bg text-st-pending",
};
const ICON: Record<DicaKind, typeof Lightbulb> = { faturamento: TrendingUp, estoque: Package, mimos: Gift, avisos: Bell };

const KEY = "ge-dicas-feitas";
const CHECK_KEY = "ge-dicas-checklist";
const read = (k: string): Record<string, number> => { try { return JSON.parse(localStorage.getItem(k) ?? "{}"); } catch { return {}; } };
const write = (k: string, v: Record<string, number>) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: vale só nesta visita */ } };
/** "Já fiz" some por 30 dias; depois disso a dica pode voltar se ainda fizer sentido. */
const KEEP = 30 * 86_400_000;

/** Dicas da Gê: sugestões para faturar mais, conferir estoque, mimar clientes e avisos úteis. */
export function DicasCard({ dicas }: { dicas: Dica[] }) {
  const toast = useToast();
  const [kind, setKind] = useState<DicaKind | "todas">("todas");
  const [done, setDone] = useState<Record<string, number>>({});
  const [checks, setChecks] = useState<Record<string, number>>({});
  const [showAll, setShowAll] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const d = Object.fromEntries(Object.entries(read(KEY)).filter(([, t]) => now - t < KEEP));
    const c = Object.fromEntries(Object.entries(read(CHECK_KEY)).filter(([, t]) => now - t < KEEP));
    // Lido do aparelho só depois de montar (no servidor não existe localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(d); setChecks(c);
  }, []);

  const pending = useMemo(() => dicas.filter((d) => !done[d.id]), [dicas, done]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { todas: pending.length };
    for (const d of pending) m[d.kind] = (m[d.kind] ?? 0) + 1;
    return m;
  }, [pending]);
  const list = (showDone ? dicas.filter((d) => done[d.id]) : pending).filter((d) => kind === "todas" || d.kind === kind);
  const visible = showAll ? list : list.slice(0, 4);
  const doneCount = dicas.length - pending.length;

  const markDone = (d: Dica) => {
    const next = { ...done, [d.id]: Date.now() };
    setDone(next); write(KEY, next);
    toast("Arrasou! Tirei essa da lista. ✨", "success", {
      action: { label: "Desfazer", onClick: () => { setDone((cur) => { const n = { ...cur }; delete n[d.id]; write(KEY, n); return n; }); } },
    });
  };
  const restore = (d: Dica) => {
    const n = { ...done }; delete n[d.id];
    setDone(n); write(KEY, n);
  };
  const toggleCheck = (key: string) => {
    const n = { ...checks };
    if (n[key]) delete n[key]; else n[key] = Date.now();
    setChecks(n); write(CHECK_KEY, n);
  };
  const copy = async (text: string, okMsg: string) => {
    if (await copyText(text)) toast(okMsg);
    else window.prompt("Copie o texto:", text);
  };

  return (
    <Card className="mt-6" data-testid="dicas">
      <CardHeader title={<span className="inline-flex items-center gap-2"><Lightbulb className="h-5 w-5 text-gold-600" />Dicas da Gê</span>}
        description="Ideias tiradas da sua agenda para faturar mais, cuidar do estoque e mimar as clientes" />
      <div className="px-5 pt-3 pb-5">
        <div role="tablist" aria-label="Tipo de dica" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {KINDS.map((k) => {
            const n = showDone ? undefined : counts[k.id] ?? 0;
            const Icon = k.icon;
            return (
              <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => { setKind(k.id); setShowAll(false); }}
                className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition",
                  kind === k.id ? "border-transparent bg-accent text-white shadow-sm" : "border-line bg-surface text-ink-soft hover:text-ink")}>
                <Icon className="h-3.5 w-3.5" />{k.label}
                {n !== undefined && n > 0 && <span className={cn("rounded-full px-1.5 text-[11px] tabular", kind === k.id ? "bg-white/25" : "bg-sunken")}>{n}</span>}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="mt-4 rounded-xl bg-sunken px-4 py-6 text-center text-sm text-muted">
            {showDone ? "Nenhuma dica marcada como feita por aqui." : "Tudo em dia por aqui! 💜 Assim que eu notar algo que pode render mais, aparece aqui."}
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {visible.map((d) => {
              const Icon = ICON[d.kind];
              return (
                <li key={d.id} className={cn("rounded-2xl border border-line bg-surface p-3.5 sm:p-4", showDone && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", TONE[d.kind])}><Icon className="h-4.5 w-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] leading-snug font-semibold">{d.title}</h3>
                      {d.value && d.value.cents > 0 && <span className="text-xs font-semibold whitespace-nowrap text-st-completed tabular">{formatMoney(d.value.cents)} {d.value.label}</span>}
                    </div>
                  </div>
                  <div className="sm:pl-12">
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{d.detail}</p>

                      {d.checklist && (
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {d.checklist.map((item) => {
                            const key = `${d.id}|${item}`;
                            return (
                              <li key={item}>
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-sunken px-2.5 py-2 text-[13px]">
                                  <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={!!checks[key]} onChange={() => toggleCheck(key)} />
                                  <span className={cn(checks[key] && "text-muted line-through")}>{item}</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {d.clients && d.clients.length > 0 && (<>
                        <ul className="mt-3 flex flex-col divide-y divide-line rounded-xl border border-line">
                          {d.clients.map((c) => (
                            <li key={c.name} className="flex items-center gap-2 px-3 py-2">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">{c.name}</span>
                                <span className="block truncate text-xs text-muted">{c.note}</span>
                              </span>
                              {c.message && c.phone && (
                                <a href={`https://wa.me/${c.phone}?text=${encodeURIComponent(c.message)}`} target="_blank" rel="noreferrer"
                                  className={buttonClass("subtle", "sm")} aria-label={`Mandar mensagem para ${c.name} no WhatsApp`}>
                                  <MessageCircle className="h-3.5 w-3.5" /><span className="hidden min-[400px]:inline">WhatsApp</span>
                                </a>
                              )}
                              {c.message && (
                                <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Copiar mensagem para ${c.name}`}
                                  onClick={() => copy(c.message, `Mensagem para ${c.name.split(" ")[0]} copiada! 💌`)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {d.moreClients ? <p className="mt-1.5 text-xs text-muted">e mais {d.moreClients}{d.id.startsWith("retorno-") ? ". Comece pelas de cima: são as que mais valem." : "."}</p> : null}
                      </>)}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.copy && <Button size="sm" variant="subtle" onClick={() => copy(d.copy!.text, "Texto copiado! É só colar no status. ✨")}><Copy className="h-3.5 w-3.5" />{d.copy.label}</Button>}
                        {d.action && <Link href={d.action.href} className={buttonClass("secondary", "sm")}>{d.action.label}</Link>}
                        {showDone
                          ? <Button size="sm" variant="ghost" onClick={() => restore(d)}><RotateCcw className="h-3.5 w-3.5" />Trazer de volta</Button>
                          : <Button size="sm" variant="ghost" onClick={() => markDone(d)}><Check className="h-3.5 w-3.5" />Já fiz</Button>}
                      </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {list.length > 4 && !showAll
            ? <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}><ChevronDown className="h-4 w-4" />Ver mais {list.length - 4}</Button>
            : <span />}
          {(doneCount > 0 || showDone) && (
            <button type="button" className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
              onClick={() => { setShowDone((v) => !v); setShowAll(false); }}>
              {showDone ? "Voltar para as dicas" : `Ver as que já fiz (${doneCount})`}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
