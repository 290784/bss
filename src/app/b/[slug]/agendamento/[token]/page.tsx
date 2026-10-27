import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, CalendarPlus, CheckCircle2, Clock, Hourglass, MapPin, MessageCircle, Phone, ShieldCheck, Sparkle, User, XCircle } from "lucide-react";
import { withSystem } from "@/server/db";
import { Sparkles } from "@/components/brand/sparkles";
import { Card } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/text";
import { formatInTz, localTime } from "@/lib/time";
import { getReceipt, type Receipt } from "@/server/modules/receipt";
import { ConfirmAttendanceButton } from "./confirm-button";

type Params = { params: Promise<{ slug: string; token: string }>; searchParams: Promise<Record<string, string | undefined>> };

// Comprovante pessoal: nunca indexar nem vazar o endereço em links externos.
export const metadata: Metadata = { title: "Seu agendamento", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Status = { title: string; text: string; icon: typeof CheckCircle2; tone: string };
const STATUS: Record<Receipt["status"], Status> = {
  confirmed: { title: "Horário reservado", text: "Seu horário está reservado.", icon: CheckCircle2, tone: "text-st-completed bg-st-completed-bg" },
  pending: { title: "Solicitação recebida", text: "O estabelecimento vai revisar e confirmar seu horário.", icon: Hourglass, tone: "text-violet-100 bg-white/10" },
  completed: { title: "Atendimento concluído", text: "Obrigada pela visita!", icon: CheckCircle2, tone: "text-st-completed bg-st-completed-bg" },
  cancelled: { title: "Agendamento cancelado", text: "Este horário foi cancelado.", icon: XCircle, tone: "text-danger bg-st-noshow-bg" },
  no_show: { title: "Horário encerrado", text: "Fale com o estabelecimento para remarcar.", icon: XCircle, tone: "text-danger bg-st-noshow-bg" },
};

export default async function ReceiptPage({ params, searchParams }: Params) {
  const { slug, token } = await params;
  const { novo } = await searchParams;
  const r = await withSystem((tx) => getReceipt(tx, slug, token));
  if (!r) notFound();
  const tz = r.business.timezone;
  const upcoming = r.startsAt > new Date() && (r.status === "confirmed" || r.status === "pending");
  // A presença só é confirmada quando a cliente toca no botão — nunca ao abrir o link.
  const askPresence = upcoming && r.status === "confirmed" && !r.clientConfirmedAt;
  const st: Status = askPresence
    ? { title: "Confirme sua presença", text: "Toque no botão abaixo para avisar que você vem. Assim já te esperamos!", icon: BellRing, tone: "text-violet-100 bg-white/10" }
    : r.status === "confirmed" && r.clientConfirmedAt
      ? { title: "Presença confirmada", text: "Obrigada por confirmar. Te esperamos!", icon: CheckCircle2, tone: "text-st-completed bg-st-completed-bg" }
      : STATUS[r.status];
  const minutes = r.services.reduce((a, s) => a + s.minutes, 0);
  const total = r.priceCents - r.discountCents;
  const bizPhone = normalizePhone(r.business.phone);
  const when = formatInTz(r.startsAt, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const services = r.services.map((s) => s.name).join(" + ");
  const waReschedule = encodeURIComponent(`Olá! Sou ${r.clientFirstName}, tenho horário de ${services} em ${when} às ${localTime(r.startsAt, tz)}, mas não vou conseguir ir. Podemos remarcar?`);
  const waText = encodeURIComponent(`Olá! Sou ${r.clientFirstName}, tenho horário de ${services} em ${when} às ${localTime(r.startsAt, tz)}.`);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="bg-royal relative overflow-hidden px-4 pt-10 pb-20">
        <Sparkles />
        <div className="relative mx-auto max-w-xl">
          <p className="text-[14px] font-semibold text-violet-100">{r.business.name}</p>
          <h1 className="mt-2 font-tight text-[30px] leading-tight font-extrabold tracking-[-0.025em] text-ink sm:text-[36px]">
            {novo ? `Pronto, ${r.clientFirstName}!` : `Olá, ${r.clientFirstName}!`}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">Aqui está o comprovante completo do seu horário. Guarde este link.</p>
        </div>
      </header>

      <main className="relative mx-auto -mt-10 flex max-w-xl flex-col gap-4 px-4 pb-16">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${st.tone}`}><st.icon className="h-6 w-6" /></span>
            <div>
              <h2 className="text-lg font-bold" data-testid="receipt-status">{st.title}</h2>
              <p className="text-[13px] text-muted">{st.text}</p>
            </div>
          </div>
          {askPresence && (
            <div className="border-b border-line px-5 py-4">
              <ConfirmAttendanceButton slug={slug} token={token} />
              {bizPhone && (
                <a href={`https://wa.me/${bizPhone}?text=${waReschedule}`} target="_blank" rel="noreferrer"
                  className="mt-3 block text-center text-[13px] font-medium text-accent-text hover:underline">Não vou conseguir ir — falar com o estabelecimento</a>
              )}
            </div>
          )}

          <dl className="grid gap-4 px-5 py-5 text-[15px]">
            <Row icon={Clock} label="Quando">
              <span className="first-letter:uppercase">{when}</span>
              <span className="block text-ink-soft">{localTime(r.startsAt, tz)} às {localTime(r.endsAt, tz)} · {minutes} min</span>
            </Row>
            <Row icon={User} label="Profissional">{r.professionalName}</Row>
            {r.business.address && (
              <Row icon={MapPin} label="Endereço">
                <a className="text-accent-text hover:underline" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.business.address)}`}>{r.business.address}</a>
              </Row>
            )}
            {bizPhone && <Row icon={Phone} label="Contato"><span className="tabular">{formatPhone(bizPhone)}</span></Row>}
          </dl>

          <div className="border-t border-line px-5 py-4">
            <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Serviços</h3>
            <ul className="divide-y divide-line text-sm">
              {r.services.map((s, i) => (
                <li key={i} className="flex justify-between gap-3 py-2"><span>{s.name}</span><span className="shrink-0 text-muted tabular">{s.minutes} min · {formatMoney(s.priceCents)}</span></li>
              ))}
              {r.discountCents > 0 && <li className="flex justify-between py-2 text-muted"><span>Desconto</span><span className="tabular">− {formatMoney(r.discountCents)}</span></li>}
              <li className="flex justify-between py-2 font-semibold"><span>Total</span><span className="tabular">{formatMoney(total)}</span></li>
            </ul>
            <p className="mt-1 text-xs text-muted">Pagamento no estabelecimento.</p>
          </div>

          {r.clientNotes && (
            <div className="border-t border-line px-5 py-4 text-sm"><span className="text-muted">Sua observação: </span>{r.clientNotes}</div>
          )}
        </Card>

        {upcoming && (
          <Card className="flex flex-col gap-3 p-5">
            {r.status === "confirmed" && r.clientConfirmedAt && (
              <p className="flex items-center justify-center gap-2 rounded-xl bg-st-completed-bg px-4 py-3 text-sm font-semibold text-st-completed" data-testid="attendance-confirmed">
                <CheckCircle2 className="h-5 w-5" />Presença confirmada. Te esperamos!
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <a href={`/b/${slug}/agendamento/${token}/calendario`} className={buttonClass("secondary", "lg", "w-full")}>
                <CalendarPlus className="h-5 w-5" />Salvar na agenda
              </a>
              {bizPhone && (
                <a href={`https://wa.me/${bizPhone}?text=${waText}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg", "w-full")}>
                  <MessageCircle className="h-5 w-5" />Falar no WhatsApp
                </a>
              )}
            </div>
          </Card>
        )}

        <Card className="flex gap-3 p-5 text-[13px] text-ink-soft">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
          <div className="space-y-1">
            <p>Precisa remarcar ou cancelar? Avise com pelo menos <strong className="text-ink">{r.business.cancellationNoticeHours} h</strong> de antecedência, falando com o estabelecimento.</p>
            {r.business.policyText && <p className="whitespace-pre-line">{r.business.policyText}</p>}
          </div>
        </Card>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Sparkle className="h-3 w-3" />
          <Link href={`/b/${slug}`} className="underline">Agendar outro horário</Link> · Agendamento por <Link href="/" className="font-script text-[20px] text-violet-100">Gê</Link>
        </p>
      </main>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
      <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 font-medium text-ink">{children}</dd></div>
    </div>
  );
}
