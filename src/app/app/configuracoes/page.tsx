import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { withSystem } from "@/server/db";
import { can, ROLE_LABEL, type Role } from "@/domain/permissions";
import { PLANS } from "@/domain/plans";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { SubTabs } from "@/components/ui/sub-tabs";
import { CreditCard, MessageCircle, ShieldCheck, Store, Users } from "lucide-react";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/cn";
import { configuredProviders, hasAutomations } from "@/server/modules/messaging";
import { WhatsAppAutomations } from "./whatsapp-automations";
import { confirmedMessage, offerMessage, reminderMessage, upsellDoneMessage } from "@/lib/messages";
import { OrganizationForm } from "./organization-form";
import { DangerZone } from "./danger-zone";
import { CopyLink } from "../copy-link";
import { plural } from "@/lib/text";

export const metadata: Metadata = { title: "Configurações" };

const ACTION_LABEL: Record<string, string> = {
  "organization.created": "Negócio criado", "organization.settings_updated": "Configurações alteradas",
  "appointment.cancelled": "Agendamento cancelado", "payment.recorded": "Pagamento registrado", "payment.refunded": "Estorno registrado",
  "client.archived": "Cliente arquivada", "client.restored": "Cliente restaurada", "client.consent_given": "Consentimento de marketing registrado",
  "client.consent_revoked": "Consentimento de marketing revogado", "clients.exported": "Clientes exportadas",
  "organization.automations_updated": "Automações do WhatsApp alteradas", "service.prices_adjusted": "Preços reajustados",
  "professional.activated": "Profissional reativada", "professional.deactivated": "Profissional desativada", "account.deletion_requested": "Exclusão de conta solicitada",
};

const TABS = [
  { id: "negocio", label: "Negócio", icon: Store },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "plano", label: "Plano", icon: CreditCard },
  { id: "acesso", label: "Acesso", icon: Users },
  { id: "conta", label: "Conta e privacidade", icon: ShieldCheck },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const ctx = await requireAppContext("settings.manage");
  const { aba } = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === aba) ? (aba as TabId) : "negocio";
  const tz = ctx.org.timezone;
  const { org, auditRows, members, auto } = await tenant(ctx, async (tx) => {
    const [org] = await tx<{
      name: string; phone: string | null; instagram: string | null; address: string | null; online_booking_enabled: boolean; online_requires_approval: boolean;
      min_advance_minutes: number; max_advance_days: number; slot_interval_minutes: number; cancellation_notice_hours: number; booking_policy_text: string | null;
    }[]>`select name, phone, instagram, address, online_booking_enabled, online_requires_approval, min_advance_minutes, max_advance_days,
           slot_interval_minutes, cancellation_notice_hours, booking_policy_text from app.organizations where id = ${ctx.org.id}`;
    const auditRows = can(ctx.role, "audit.view")
      ? await tx<{ action: string; created_at: Date; actor_user_id: string | null }[]>`
          select action, created_at, actor_user_id from app.audit_log where organization_id = ${ctx.org.id} order by created_at desc limit 15`
      : [];
    const members = await tx<{ user_id: string; role: Role; status: string }[]>`select user_id, role, status from app.memberships where organization_id = ${ctx.org.id}`;
    const [flags] = await tx<{ whatsapp_reminder_enabled: boolean; whatsapp_upsell_enabled: boolean }[]>`
      select whatsapp_reminder_enabled, whatsapp_upsell_enabled from app.organizations where id = ${ctx.org.id}`;
    const [stats] = await tx<{ reminders: number; offers: number; confirmed: number; accepted: number; extra_cents: number }[]>`
      select
        (select count(*) from app.message_jobs where organization_id = ${ctx.org.id} and template = 'appointment_reminder' and status = 'sent' and sent_at > now() - interval '30 days')::int as reminders,
        (select count(*) from app.message_jobs where organization_id = ${ctx.org.id} and template = 'upsell_offer' and status = 'sent' and sent_at > now() - interval '30 days')::int as offers,
        (select count(*) from app.appointment_events where organization_id = ${ctx.org.id} and type = 'client_confirmed' and data->>'via' = 'whatsapp' and created_at > now() - interval '30 days')::int as confirmed,
        (select count(*) from app.appointment_events where organization_id = ${ctx.org.id} and type = 'upsell_accepted' and created_at > now() - interval '30 days')::int as accepted,
        coalesce((select sum((data->>'priceCents')::int) from app.appointment_events where organization_id = ${ctx.org.id} and type = 'upsell_accepted' and created_at > now() - interval '30 days'), 0)::int as extra_cents`;
    const [pro] = await tx<{ display_name: string }[]>`select display_name from app.professionals where organization_id = ${ctx.org.id} and is_active order by created_at limit 1`;
    const automations = await hasAutomations(tx, ctx.org.id);
    return { org: org!, auditRows, members, auto: { flags: flags!, stats: stats!, proName: pro?.display_name ?? "Bia", automations } };
  });
  // Nomes de usuárias: tabela de identidade só é lida no contexto de sistema, filtrando pelos membros desta organização.
  const ids = [...new Set([...members.map((m) => m.user_id), ...auditRows.map((a) => a.actor_user_id).filter(Boolean) as string[]])];
  const names = new Map((ids.length ? await withSystem((tx) => tx<{ id: string; full_name: string; email: string }[]>`select id, full_name, email from app.users where id in ${tx(ids)}`) : []).map((u) => [u.id, u]));
  const providers = configuredProviders();
  // Exemplo da conversa com os textos reais da automação (nomes de exemplo).
  const demoStart = new Date(new Date().getTime() + 86_400_000);
  demoStart.setUTCHours(17, 0, 0, 0);
  const preview = [
    { from: "ge" as const, text: reminderMessage({ clientName: "Ana", services: ["Manicure"], startsAt: demoStart, timeZone: tz, professionalName: auto.proName, businessName: org.name }), buttons: ["Confirmo", "Preciso remarcar"] },
    { from: "cliente" as const, text: "Confirmo" },
    ...(auto.flags.whatsapp_upsell_enabled
      ? [{ from: "ge" as const, text: offerMessage({ professionalName: auto.proName, serviceName: "Esmaltação em gel", priceCents: 2500 }), buttons: ["Quero sim", "Agora não"] },
         { from: "cliente" as const, text: "SIM" },
         { from: "ge" as const, text: upsellDoneMessage({ items: [{ name: "Manicure", startsAt: demoStart }, { name: "Esmaltação em gel", startsAt: new Date(demoStart.getTime() + 45 * 60_000) }], timeZone: tz, totalCents: 6000 }) },
         { from: "app" as const, text: "Você recebe: Ana adicionou Esmaltação em gel! +R$ 25,00" }]
      : [{ from: "ge" as const, text: confirmedMessage() }]),
  ];
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const sub = ctx.subscription;

  const linkCard = (
    <Card data-theme="dark" className="relative overflow-hidden border-transparent bg-plum! p-5 text-white sm:p-6">
      <h2 className="font-serif text-[18px] font-semibold">Página de agendamento</h2>
      <p className="mt-1 mb-3 text-xs text-white/65">{org.online_booking_enabled ? "No ar: as clientes já podem marcar pelo seu link." : "Pausada: o seu link avisa que o agendamento online está fechado por enquanto."}</p>
      <CopyLink url={`${appUrl}/b/${ctx.org.slug}`} />
    </Card>
  );

  return (
    <div>
      <PageHeader title="Configurações" description="Escolha um assunto: dados do negócio, mensagens, plano, acesso da equipe ou privacidade." />
      <SubTabs label="Assuntos das configurações" tabs={[...TABS]} current={tab} href={(id) => (id === "negocio" ? "/app/configuracoes" : `/app/configuracoes?aba=${id}`)} />

      {tab === "negocio" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <OrganizationForm org={org} readOnly={ctx.access === "read_only"} />
          <div className="order-first xl:order-none">{linkCard}</div>
        </div>
      )}

      {tab === "whatsapp" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <WhatsAppAutomations connected={providers.some((p) => p.channel === "whatsapp")} planHasAutomations={auto.automations}
            reminder={auto.flags.whatsapp_reminder_enabled} upsell={auto.flags.whatsapp_upsell_enabled} readOnly={ctx.access === "read_only"}
            preview={preview} stats={{ reminders: auto.stats.reminders, confirmed: auto.stats.confirmed, offers: auto.stats.offers, accepted: auto.stats.accepted, extraCents: auto.stats.extra_cents }} />
          <Card>
            <CardHeader title="Canais de mensagem" description="Para mandar lembretes e confirmações sozinha" />
            <ul className="px-5 pt-3 pb-5 text-sm sm:px-6 sm:pb-6">
              {(["whatsapp", "email"] as const).map((ch) => {
                const connected = providers.some((p) => p.channel === ch);
                return (
                  <li key={ch} className="flex items-center justify-between py-1.5">
                    <span>{ch === "whatsapp" ? "WhatsApp Business" : "E-mail"}</span>
                    <Badge variant={connected ? "success" : "neutral"}>{connected ? "Conectado" : "Não conectado"}</Badge>
                  </li>
                );
              })}
              <li className="pt-2 text-xs text-muted">Enquanto nada estiver conectado, as mensagens ficam anotadas como “não enviadas” no agendamento e nada vai para as clientes. Você pode mandar a confirmação pelo seu WhatsApp direto da agenda.</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === "plano" && (
        <div className="max-w-2xl">
          <Card id="assinatura">
            <CardHeader title="Assinatura" description={sub.status === "trialing" && sub.trialEndsAt ? `Teste gratuito até ${formatInTz(sub.trialEndsAt, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}` : undefined}
              action={<Badge variant={ctx.access === "full" ? "success" : ctx.access === "grace" ? "warning" : "danger"}>{{ trialing: "Em teste", active: "Ativa", past_due: "Pagamento pendente", canceled: "Cancelada" }[sub.status]}</Badge>} />
            <div className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
              <ul className="flex flex-col gap-2">
                {Object.values(PLANS).map((p) => (
                  <li key={p.id} className={cn("rounded-[var(--radius-control)] border px-4 py-3 text-sm", ctx.plan.id === p.id ? "border-accent-muted bg-accent-subtle" : "border-line/80")}>
                    <div className="flex items-center justify-between font-medium">{p.name}{ctx.plan.id === p.id && <Badge variant="plum">Atual</Badge>}</div>
                    <div className="text-xs text-muted">{p.tagline} · até {plural(p.maxProfessionals, "profissional", "profissionais")} · {plural(p.maxUnits, "unidade")}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Os planos pagos ainda estão chegando. Durante o teste você usa tudo de graça e nada é cobrado.</p>
            </div>
          </Card>
        </div>
      )}

      {tab === "acesso" && (
        <div className="grid max-w-4xl gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader title="Equipe com acesso" description="Convites por e-mail ainda não estão disponíveis" />
            <ul className="divide-y divide-line/70 px-5 pt-2 pb-4 text-sm sm:px-6">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate">{names.get(m.user_id)?.full_name ?? "—"}<span className="block truncate text-xs text-muted">{names.get(m.user_id)?.email}</span></span>
                  <Badge>{ROLE_LABEL[m.role]}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          {auditRows.length > 0 && (
            <Card>
              <CardHeader title="Atividades recentes" description="Registro de auditoria" />
              <ul className="divide-y divide-line/70 px-5 pt-2 pb-4 text-[13px] sm:px-6">
                {auditRows.map((a, i) => (
                  <li key={i} className="py-2.5">
                    <div>{ACTION_LABEL[a.action] ?? a.action}</div>
                    <div className="text-xs text-muted">{a.actor_user_id ? names.get(a.actor_user_id)?.full_name ?? "—" : "Seu link de agendamento"} · {formatInTz(a.created_at, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "conta" && <div className="max-w-2xl"><DangerZone /></div>}
    </div>
  );
}
