import type { Metadata } from "next";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import { requireAppContext, tenant } from "@/server/context";
import { listClients, SEGMENTS, type Segment } from "@/server/modules/clients";
import { can } from "@/domain/permissions";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/text";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/cn";
import { NewClientButton } from "./new-client-button";

export const metadata: Metadata = { title: "Clientes" };
const PAGE = 50;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; segmento?: string; pagina?: string; nova?: string }> }) {
  const ctx = await requireAppContext("clients.view");
  const sp = await searchParams;
  const segment = (Object.keys(SEGMENTS).includes(sp.segmento ?? "") ? sp.segmento : "all") as Segment;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const finance = can(ctx.role, "finance.view");
  const rows = await tenant(ctx, (tx) => listClients(tx, ctx.org.id, { q: sp.q, segment, includeSpent: finance, limit: PAGE + 1, offset: (page - 1) * PAGE }));
  const hasMore = rows.length > PAGE;
  const tz = ctx.org.timezone;
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), segmento: segment, ...extra }).toString();

  return (
    <div>
      <PageHeader title="Clientes" description="Suas clientes: quem vem sempre, quem sumiu e quanto cada uma já deixou com você."
        actions={<>
          {can(ctx.role, "clients.manage") && (
            <a href={`/app/clientes/exportar?${qs({})}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-sunken">
              <Download className="h-4 w-4" />Exportar CSV
            </a>
          )}
          {can(ctx.role, "clients.manage") && ctx.access !== "read_only" && <NewClientButton autoOpen={sp.nova === "1"} canInternal={can(ctx.role, "clients.view_internal_notes")} />}
        </>} />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <form className="flex-1" role="search">
          <input type="hidden" name="segmento" value={segment} />
          <input name="q" defaultValue={sp.q} placeholder="Busque pelo nome, telefone ou e-mail" aria-label="Buscar"
            className="h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent-muted focus:outline-none md:max-w-sm" />
        </form>
        <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Segmentos">
          {(Object.entries(SEGMENTS) as [Segment, string][]).filter(([k]) => finance || k !== "high_value").map(([k, label]) => (
            <Link key={k} href={`/app/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), segmento: k })}`} aria-current={k === segment ? "page" : undefined}
              className={cn("h-10 shrink-0 rounded-full border px-3 text-[13px] leading-[38px] sm:h-8 sm:leading-[30px] font-medium", k === segment ? "border-violet-300 btn-glow text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong")}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Users} title={sp.q ? "Não achei ninguém com esse nome" : "Ninguém por aqui ainda"}
            description={sp.q ? "Confere a escrita ou tenta pelo telefone." : "As clientes que você cadastrar ou que marcarem pelo seu link aparecem aqui."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-canvas/60 text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th><th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 text-right font-medium">Visitas</th><th className="px-4 py-2.5 font-medium">Última visita</th>
                  <th className="px-4 py-2.5 font-medium">Próxima</th>{finance && <th className="px-4 py-2.5 text-right font-medium">Total gasto</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, PAGE).map((c) => (
                  <tr key={c.id} className="hover:bg-canvas/70">
                    <td className="px-4 py-3"><Link href={`/app/clientes/${c.id}`} className="font-medium text-ink hover:text-accent-text">{c.full_name}</Link></td>
                    <td className="px-4 py-3 text-ink-soft tabular">{formatPhone(c.phone_normalized) || c.email || "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{c.visits}</td>
                    <td className="px-4 py-3 text-ink-soft tabular">{c.last_visit ? formatInTz(c.last_visit, tz, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3 text-ink-soft tabular">{c.next_visit ? formatInTz(c.next_visit, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    {finance && <td className="px-4 py-3 text-right tabular">{formatMoney(c.total_spent_cents)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {(page > 1 || hasMore) && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={`/app/clientes?${qs({ pagina: String(page - 1) })}`} className="text-accent-text hover:underline">← Anterior</Link> : <span />}
          {hasMore && <Link href={`/app/clientes?${qs({ pagina: String(page + 1) })}`} className="text-accent-text hover:underline">Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
