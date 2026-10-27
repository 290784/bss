import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, MessageCircle } from "lucide-react";
import { z } from "zod";
import { requireAppContext, tenant } from "@/server/context";
import { getClientProfile } from "@/server/modules/clients";
import { can } from "@/domain/permissions";
import { Badge, Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/text";
import { formatInTz, localDateKey } from "@/lib/time";
import type { AppointmentStatus } from "@/domain/appointment-status";
import { ClientEditor } from "./client-editor";

export const metadata: Metadata = { title: "Ficha da cliente" };

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext("clients.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const finance = can(ctx.role, "finance.view");
  const internal = can(ctx.role, "clients.view_internal_notes");
  const profile = await tenant(ctx, (tx) => getClientProfile(tx, ctx.org.id, id, { includeFinance: finance, includeInternal: internal }));
  if (!profile) notFound();
  const { client: c, history, stats } = profile;
  const tz = ctx.org.timezone;
  const date = (d: Date | null) => (d ? formatInTz(d, tz, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

  return (
    <div>
      <Link href="/app/clientes" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ChevronLeft className="h-4 w-4" />Clientes</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-tight tracking-[-0.02em] text-[28px] leading-tight font-extrabold">{c.full_name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            {c.phone_normalized && <span className="tabular">{formatPhone(c.phone_normalized)}</span>}
            {c.email && <span>· {c.email}</span>}
            {c.source === "online" && <Badge variant="plum">Veio pelo agendamento online</Badge>}
            {c.archived_at && <Badge>Arquivada</Badge>}
            {c.marketing_consent ? <Badge variant="success">Aceita promoções</Badge> : <Badge>Sem consentimento de marketing</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {c.phone_normalized && c.contact_preference !== "none" && (
            <a href={`https://wa.me/${c.phone_normalized}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-sunken">
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
          <ClientEditor
            client={{ id: c.id, fullName: c.full_name, phone: c.phone, email: c.email, birthDate: c.birth_date, contactPreference: c.contact_preference, marketingConsent: c.marketing_consent, preferences: c.preferences, internalNotes: c.internal_notes }}
            canEdit={can(ctx.role, "clients.manage") && ctx.access !== "read_only"} canInternal={internal} canArchive={can(ctx.role, "clients.delete")} archived={!!c.archived_at} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Visitas concluídas" value={String(stats.visits)} />
        <Stat label="Última visita" value={date(stats.lastVisit)} />
        <Stat label="Próxima visita" value={stats.nextVisit ? formatInTz(stats.nextVisit, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"} />
        <Stat label="Frequência média" value={stats.avgIntervalDays ? `a cada ${stats.avgIntervalDays} dias` : "—"} />
        {finance && <Stat label="Total gasto" value={formatMoney(stats.totalSpentCents ?? 0)} hint="Pagamentos menos estornos" />}
        {finance && <Stat label="Ticket médio" value={stats.averageTicketCents === null ? "—" : formatMoney(stats.averageTicketCents)} />}
        <Stat label="Faltas · cancelamentos" value={`${stats.noShows} · ${stats.cancellations}`} />
        <Stat label="Profissional preferida" value={stats.favoriteProfessional ?? "—"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Histórico de atendimentos" description={`${history.length} registro(s)`} />
          <div className="px-5 pt-3 pb-5">
            {history.length === 0 ? (
              <EmptyState className="py-8" icon={CalendarDays} title="Nenhum atendimento ainda" description="Os agendamentos desta cliente aparecerão aqui." />
            ) : (
              <ol className="divide-y divide-line">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/app/agenda?data=${localDateKey(h.starts_at, tz)}&agendamento=${h.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.04] active:scale-[0.99]">
                      <div className="w-24 shrink-0 text-sm tabular">
                        <div className="font-medium">{formatInTz(h.starts_at, tz, { day: "2-digit", month: "2-digit", year: "2-digit" })}</div>
                        <div className="text-xs text-muted">{formatInTz(h.starts_at, tz, { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{h.services}</div>
                        <div className="text-xs text-muted">com {h.professional_name}{finance ? ` · ${formatMoney(h.price_cents - h.discount_cents)}` : ""}</div>
                      </div>
                      <StatusBadge status={h.status as AppointmentStatus} />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Preferências</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{c.preferences || <span className="text-muted">Nenhuma preferência registrada.</span>}</p>
          </Card>
          {internal && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">Observações internas <Badge>restrito</Badge></h2>
              <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{c.internal_notes || <span className="text-muted">Nenhuma observação.</span>}</p>
            </Card>
          )}
          <Card className="p-5 text-sm">
            <h2 className="text-[15px] font-semibold">Dados e consentimento</h2>
            <dl className="mt-2 space-y-1.5 text-ink-soft">
              <div className="flex justify-between"><dt className="text-muted">Cadastro</dt><dd>{date(c.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Contato preferido</dt><dd>{{ whatsapp: "WhatsApp", email: "E-mail", phone: "Ligação", none: "Não contatar" }[c.contact_preference]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Marketing</dt><dd>{c.marketing_consent ? `Autorizado em ${date(c.marketing_consent_at)}` : "Não autorizado"}</dd></div>
              {c.birth_date && <div className="flex justify-between"><dt className="text-muted">Nascimento</dt><dd>{c.birth_date.split("-").reverse().join("/")}</dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tabular">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </Card>
  );
}
