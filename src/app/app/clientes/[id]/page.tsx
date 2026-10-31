import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, Crown, Heart, Moon, Sparkles } from "lucide-react";
import { z } from "zod";
import { requireAppContext, tenant } from "@/server/context";
import { getClientProfile } from "@/server/modules/clients";
import { can } from "@/domain/permissions";
import { Avatar, Badge, Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatPhone, plural } from "@/lib/text";
import { cn } from "@/lib/cn";
import { addDaysToKey, formatInTz, localDateKey } from "@/lib/time";
import type { AppointmentStatus } from "@/domain/appointment-status";
import { ClientEditor } from "./client-editor";
import { QuickMessages, type QuickMessage } from "./quick-messages";
import { servicesText } from "@/lib/messages";

export const metadata: Metadata = { title: "Ficha da cliente" };

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext("clients.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const finance = can(ctx.role, "finance.view");
  const internal = can(ctx.role, "clients.view_internal_notes");
  const profile = await tenant(ctx, (tx) => getClientProfile(tx, ctx.org.id, id, { includeFinance: finance, includeInternal: internal }));
  if (!profile) notFound();
  const { client: c, history, stats, services, idealReturn, isVip } = profile;
  const tz = ctx.org.timezone;
  const date = (d: Date | null) => (d ? formatInTz(d, tz, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
  const now = new Date().getTime();
  const todayKey = localDateKey(new Date(), tz);
  const first = c.full_name.split(" ")[0]!;
  const canBook = ctx.access !== "read_only" && can(ctx.role, "agenda.manage") && !c.archived_at;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${appUrl}/b/${ctx.org.slug}`;

  // Aniversário: quantos dias faltam (0 = hoje).
  let bdayIn: number | null = null;
  if (c.birth_date) {
    let k = `${todayKey.slice(0, 4)}${c.birth_date.slice(4)}`;
    if (k < todayKey) k = `${Number(todayKey.slice(0, 4)) + 1}${c.birth_date.slice(4)}`;
    bdayIn = Math.round((Date.parse(k) - Date.parse(todayKey)) / 86_400_000);
  }
  const firstVisit = history.filter((h) => h.status === "completed").at(-1)?.starts_at ?? null;
  const isNew = (firstVisit && now - firstVisit.getTime() < 30 * 86_400_000) || (stats.visits === 0 && now - c.created_at.getTime() < 30 * 86_400_000);
  const sumida = stats.visits >= 1 && stats.lastVisit && now - stats.lastVisit.getTime() > 60 * 86_400_000 && !stats.nextVisit;
  const returnDays = idealReturn ? Math.round((idealReturn.date.getTime() - now) / 86_400_000) : null;
  const fav = services[0]?.name;

  const messages: QuickMessage[] = [
    ...(bdayIn !== null && bdayIn <= 15 ? [{ id: "aniversario", label: "🎂 Aniversário", text: bdayIn === 0
      ? `Feliz aniversário, ${first}! 🎂💜 Que seu dia seja lindo! Pra comemorar, tem um mimo especial te esperando no seu próximo horário aqui. Bora marcar? ${bookingUrl}`
      : `Oi, ${first}! Seu aniversário tá chegando 🎂 e eu separei um presentinho: no seu próximo horário tem um mimo especial te esperando. Quer que eu reserve um horário pra você ficar ainda mais linda pro seu dia? 💜` }] : []),
    { id: "voltar", label: "Chamar para voltar", text: `Oi, ${first}! Tudo bem? 💜 ${stats.lastVisit ? `Já faz um tempinho desde o seu ${fav ? servicesText([fav]) : "último horário"}` : "Tô com uns horários livres essa semana"}, bora caprichar de novo? Me fala o melhor dia que eu separo pra você, ou escolhe direto aqui: ${bookingUrl}` },
    { id: "obrigada", label: "Agradecer a visita", text: `Oi, ${first}! Obrigada pela visita, foi um prazer te atender 💜 Se puder, me conta o que achou? Qualquer coisa é só chamar!` },
    { id: "horario", label: "Oferecer horário", text: `Oi, ${first}! Abriu um horário especial aqui ${fav ? `pro seu ${servicesText([fav])} ` : ""}e lembrei de você ✨ Quer que eu reserve?` },
    { id: "promo", label: "Novidade / promoção", text: `Oi, ${first}! Tenho uma novidade que é a sua cara 😍 Essa semana quem marcar ganha um mimo especial. Quer saber mais?` },
  ];
  const highlight = bdayIn !== null && bdayIn <= 15 ? "aniversario" : sumida || (returnDays !== null && returnDays < 0) ? "voltar" : undefined;

  return (
    <div>
      <Link href="/app/clientes" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ChevronLeft className="h-4 w-4" />Clientes</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={c.full_name} className="h-14 w-14 text-lg" />
          <div className="min-w-0">
            <h1 className="font-tight tracking-[-0.02em] text-[26px] leading-tight font-extrabold sm:text-[28px]">{c.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {c.phone_normalized && <span className="tabular">{formatPhone(c.phone_normalized)}</span>}
              {c.email && <span>· {c.email}</span>}
              <span>· cliente desde {formatInTz(firstVisit ?? c.created_at, tz, { month: "long", year: "numeric" })}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isVip && <Badge variant="champagne"><Crown className="h-3 w-3" />VIP</Badge>}
              {isNew && <Badge variant="success"><Sparkles className="h-3 w-3" />Nova</Badge>}
              {sumida && <Badge variant="warning"><Moon className="h-3 w-3" />Sumida</Badge>}
              {bdayIn !== null && bdayIn <= 30 && <Badge variant="plum">🎂 {bdayIn === 0 ? "Aniversário hoje!" : bdayIn === 1 ? "Aniversário amanhã" : `Aniversário em ${bdayIn} dias`}</Badge>}
              {c.source === "online" && <Badge variant="plum">Chegou pelo seu link</Badge>}
              {c.archived_at && <Badge>Arquivada</Badge>}
              {c.marketing_consent ? <Badge variant="success">Topa promoções 💌</Badge> : <Badge>Não quer promoções</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBook && <Link href={`/app/agenda?novo=${c.id}`} className={buttonClass("primary", "md")}><CalendarPlus className="h-4 w-4" />Agendar</Link>}
          <ClientEditor
            client={{ id: c.id, fullName: c.full_name, phone: c.phone, email: c.email, birthDate: c.birth_date, contactPreference: c.contact_preference, marketingConsent: c.marketing_consent, preferences: c.preferences, internalNotes: c.internal_notes }}
            canEdit={can(ctx.role, "clients.manage") && ctx.access !== "read_only"} canInternal={internal} canArchive={can(ctx.role, "clients.delete")} archived={!!c.archived_at} />
        </div>
      </div>

      {idealReturn && !stats.nextVisit && !c.archived_at && (
        <div className={cn("mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", returnDays! < 0 ? "border-st-pending/30 bg-st-pending-bg" : "border-line bg-surface")}>
          <CalendarDays className={cn("h-5 w-5 shrink-0", returnDays! < 0 ? "text-st-pending" : "text-accent-text")} />
          <div className="flex-1 text-sm">
            <span className="font-semibold">
              {returnDays! < 0 ? `Já passou ${Math.abs(returnDays!)} ${Math.abs(returnDays!) === 1 ? "dia" : "dias"} do tempo ideal de voltar` : returnDays === 0 ? "Hoje é o dia ideal para ela voltar" : `Ideal voltar até ${formatInTz(idealReturn.date, tz, { day: "2-digit", month: "2-digit" })} (em ${returnDays} ${returnDays === 1 ? "dia" : "dias"})`}
            </span>
            <span className="text-ink-soft"> · {idealReturn.reason}. {returnDays! < 0 ? "Uma mensagem carinhosa agora traz ela de volta." : "Que tal já deixar marcado?"}</span>
          </div>
          {canBook && <Link href={`/app/agenda?novo=${c.id}&data=${returnDays! > 0 ? addDaysToKey(todayKey, Math.min(returnDays!, 60)) : todayKey}`} className={buttonClass("secondary", "sm")}>Marcar retorno</Link>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Visitas" value={String(stats.visits)} />
        <Stat label="Última visita" value={date(stats.lastVisit)} />
        <Stat label="Próxima visita" value={stats.nextVisit ? formatInTz(stats.nextVisit, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"} />
        <Stat label="Frequência média" value={stats.avgIntervalDays ? `volta a cada ${stats.avgIntervalDays} dias` : "—"} />
        {finance && <Stat label="Total gasto" value={formatMoney(stats.totalSpentCents ?? 0)} hint="Já descontados os estornos" />}
        {finance && <Stat label="Ticket médio" value={stats.averageTicketCents === null ? "—" : formatMoney(stats.averageTicketCents)} />}
        <Stat label="Faltas · cancelamentos" value={`${stats.noShows} · ${stats.cancellations}`} />
        <Stat label="Profissional favorita" value={stats.favoriteProfessional ?? "—"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Histórico com você" description={plural(history.length, "registro")} />
          <div className="px-5 pt-3 pb-5">
            {history.length === 0 ? (
              <EmptyState className="py-8" icon={CalendarDays} title="Nenhum atendimento ainda" description="Assim que ela marcar, os horários aparecem aqui." />
            ) : (
              <ol className="divide-y divide-line">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/app/agenda?data=${localDateKey(h.starts_at, tz)}&agendamento=${h.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-hover-tint active:scale-[0.99]">
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
          {c.contact_preference !== "none" && !c.archived_at && <QuickMessages phone={c.phone_normalized} messages={messages} highlight={highlight} />}
          {services.length > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Heart className="h-4 w-4 text-accent-text" />O que ela mais faz</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {services.map((s) => (
                  <li key={s.name} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted tabular">{s.n}× · última {formatInTz(s.last, tz, { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-violet-500),var(--color-violet-300))]" style={{ width: `${(s.n / services[0]!.n) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Preferências</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{c.preferences || <span className="text-muted">Nenhuma preferência anotada ainda.</span>}</p>
          </Card>
          {internal && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">Observações internas <Badge>restrito</Badge></h2>
              <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{c.internal_notes || <span className="text-muted">Nenhuma observação ainda.</span>}</p>
            </Card>
          )}
          <Card className="p-5 text-sm">
            <h2 className="text-[15px] font-semibold">Contato e autorizações</h2>
            <dl className="mt-2 space-y-1.5 text-ink-soft">
              <div className="flex justify-between"><dt className="text-muted">Cadastro</dt><dd>{date(c.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Contato preferido</dt><dd>{{ whatsapp: "WhatsApp", email: "E-mail", phone: "Ligação", none: "Prefere não ser contatada" }[c.contact_preference]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Marketing</dt><dd>{c.marketing_consent ? (c.marketing_consent_at ? `Autorizado em ${date(c.marketing_consent_at)}` : "Autorizado") : "Não autorizou"}</dd></div>
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
