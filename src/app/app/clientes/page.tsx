import type { Metadata } from "next";
import Link from "next/link";
import { Cake, ChevronRight, Crown, Download, MessageCircle, Sparkles, Users, Moon } from "lucide-react";
import { requireAppContext, tenant } from "@/server/context";
import { countSegments, listClients, SEGMENT_HINT, SEGMENTS, SORTS, type ClientRow, type Segment, type Sort } from "@/server/modules/clients";
import { can } from "@/domain/permissions";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { formatPhone, plural } from "@/lib/text";
import { formatInTz, localDateKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { NewClientButton } from "./new-client-button";
import { ClientListControls } from "./list-controls";

export const metadata: Metadata = { title: "Clientes" };
const PAGE = 50;
const DAY = 86_400_000;

/** "hoje", "ontem", "há 12 dias", "há 3 meses" */
function ago(d: Date, now: number) {
  const days = Math.floor((now - d.getTime()) / DAY);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 45) return `há ${days} dias`;
  const m = Math.round(days / 30);
  return m < 12 ? `há ${m} meses` : `há ${Math.floor(days / 365) === 1 ? "1 ano" : `${Math.floor(days / 365)} anos`}`;
}

function tags(c: ClientRow, now: number, month: string) {
  const t: { label: string; variant: "plum" | "champagne" | "success" | "warning" | "neutral"; icon?: typeof Crown }[] = [];
  if (c.is_vip) t.push({ label: "VIP", variant: "champagne", icon: Crown });
  if ((c.first_visit && now - c.first_visit.getTime() < 30 * DAY) || (c.visits === 0 && now - c.created_at.getTime() < 30 * DAY)) t.push({ label: "Nova", variant: "success", icon: Sparkles });
  if (c.visits >= 1 && c.last_visit && now - c.last_visit.getTime() > 60 * DAY && !c.next_visit) t.push({ label: "Sumida", variant: "warning", icon: Moon });
  if (c.birth_md?.startsWith(month)) t.push({ label: `🎂 ${c.birth_md.slice(3)}/${month}`, variant: "plum" });
  return t;
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; segmento?: string; pagina?: string; nova?: string; ordem?: string }> }) {
  const ctx = await requireAppContext("clients.view");
  const sp = await searchParams;
  const segment = (Object.keys(SEGMENTS).includes(sp.segmento ?? "") ? sp.segmento : "all") as Segment;
  const finance = can(ctx.role, "finance.view");
  const sort = (Object.keys(SORTS).includes(sp.ordem ?? "") && (sp.ordem !== "gasto" || finance) ? sp.ordem : "nome") as Sort;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const tz = ctx.org.timezone;
  const [rows, counts] = await tenant(ctx, (tx) => Promise.all([
    listClients(tx, ctx.org.id, { q: sp.q, segment, sort, includeSpent: finance, timeZone: tz, limit: PAGE + 1, offset: (page - 1) * PAGE }),
    countSegments(tx, ctx.org.id, { includeSpent: finance, timeZone: tz }),
  ]));
  const hasMore = rows.length > PAGE;
  const now = new Date().getTime();
  const month = localDateKey(new Date(), tz).slice(5, 7);
  const canManage = can(ctx.role, "clients.manage");
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sort !== "nome" ? { ordem: sort } : {}), segmento: segment, ...extra }).toString();
  const segs = (Object.entries(SEGMENTS) as [Segment, string][]).filter(([k]) => finance || k !== "high_value");
  const list = rows.slice(0, PAGE);
  const wa = (c: ClientRow) => c.phone_normalized ? `https://wa.me/${c.phone_normalized}?text=${encodeURIComponent(`Oi, ${c.full_name.split(" ")[0]}! Tudo bem? 💜`)}` : null;

  return (
    <div>
      <PageHeader title="Clientes" description={`${plural(counts.all, "cliente")} com você. Quem vem sempre, quem sumiu e quanto cada uma já deixou no seu caixa.`}
        actions={<>
          {canManage && (
            <a href={`/app/clientes/exportar?${qs({})}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-sunken">
              <Download className="h-4 w-4" />Exportar
            </a>
          )}
          {canManage && ctx.access !== "read_only" && <NewClientButton autoOpen={sp.nova === "1"} canInternal={can(ctx.role, "clients.view_internal_notes")} />}
        </>} />

      <nav className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label="Grupos de clientes">
        {segs.map(([k, label]) => (
          <Link key={k} href={`/app/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sort !== "nome" ? { ordem: sort } : {}), segmento: k })}`}
            aria-current={k === segment ? "page" : undefined} scroll={false}
            className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition sm:h-9",
              k === segment ? "border-transparent btn-glow text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink")}>
            {label}
            <span className={cn("rounded-full px-1.5 text-[11px] tabular", k === segment ? "bg-white/25" : "bg-sunken")}>{counts[k]}</span>
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-[13px] text-muted">{SEGMENT_HINT[segment]}</p>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <ClientListControls sort={sort} sorts={(Object.entries(SORTS) as [Sort, string][]).filter(([k]) => finance || k !== "gasto").map(([id, label]) => ({ id, label }))} />
      </div>

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={Users} title={sp.q ? "Não achei ninguém com esse nome" : segment === "all" ? "Ninguém por aqui ainda" : "Ninguém neste grupo agora"}
            description={sp.q ? "Confere a escrita ou tenta pelo telefone." : segment === "all" ? "As clientes que você cadastrar ou que marcarem pelo seu link aparecem aqui." : "Que bom (ou ainda não deu tempo)! Quando alguém se encaixar, aparece aqui."} />
        ) : (
          <>
            {/* Celular: cartões */}
            <ul className="divide-y divide-line md:hidden">
              {list.map((c) => {
                const link = wa(c);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/app/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={c.full_name} className="h-10 w-10 text-[13px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.full_name}</span>
                        <span className="block truncate text-xs text-muted">
                          {c.visits ? `${plural(c.visits, "visita")} · última ${ago(c.last_visit!, now)}` : "Ainda não veio"}
                          {finance && c.total_spent_cents > 0 ? ` · ${formatMoney(c.total_spent_cents)}` : ""}
                        </span>
                        {tags(c, now, month).length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">{tags(c, now, month).map((t) => <Badge key={t.label} variant={t.variant}>{t.icon && <t.icon className="h-3 w-3" />}{t.label}</Badge>)}</span>
                        )}
                      </span>
                    </Link>
                    {link && <a href={link} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${c.full_name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text"><MessageCircle className="h-4.5 w-4.5" /></a>}
                  </li>
                );
              })}
            </ul>
            {/* Computador: tabela */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-line bg-canvas/60 text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Cliente</th><th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 text-right font-medium">Visitas</th><th className="px-4 py-2.5 font-medium">Última visita</th>
                  <th className="px-4 py-2.5 font-medium">Próxima</th>{finance && <th className="px-4 py-2.5 text-right font-medium">Total gasto</th>}
                  <th className="w-12 px-2 py-2.5"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((c) => {
                  const link = wa(c);
                  return (
                    <tr key={c.id} className="group hover:bg-canvas/70">
                      <td className="px-4 py-2.5">
                        <Link href={`/app/clientes/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.full_name} />
                          <span className="min-w-0">
                            <span className="block font-medium text-ink group-hover:text-accent-text">{c.full_name}</span>
                            {tags(c, now, month).length > 0 && <span className="mt-0.5 flex flex-wrap gap-1">{tags(c, now, month).map((t) => <Badge key={t.label} variant={t.variant}>{t.icon && <t.icon className="h-3 w-3" />}{t.label}</Badge>)}</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft tabular">{formatPhone(c.phone_normalized) || c.email || "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular">{c.visits}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{c.last_visit ? <span title={formatInTz(c.last_visit, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}>{ago(c.last_visit, now)}</span> : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-soft tabular">{c.next_visit ? formatInTz(c.next_visit, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      {finance && <td className="px-4 py-2.5 text-right tabular">{formatMoney(c.total_spent_cents)}</td>}
                      <td className="px-2 py-2.5">
                        {link ? <a href={link} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${c.full_name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-accent-subtle hover:text-accent-text"><MessageCircle className="h-4 w-4" /></a>
                          : <Link href={`/app/clientes/${c.id}`} aria-label="Abrir ficha" className="grid h-8 w-8 place-items-center text-muted"><ChevronRight className="h-4 w-4" /></Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </Card>
      {(page > 1 || hasMore) && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={`/app/clientes?${qs({ pagina: String(page - 1) })}`} className="text-accent-text hover:underline">← Anterior</Link> : <span />}
          {hasMore && <Link href={`/app/clientes?${qs({ pagina: String(page + 1) })}`} className="text-accent-text hover:underline">Próxima →</Link>}
        </div>
      )}
      {segment === "birthday" && list.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted"><Cake className="h-4 w-4 text-accent-text" />Dica: mande um parabéns com um mimo no próximo horário. Elas lembram desse carinho!</p>
      )}
    </div>
  );
}
