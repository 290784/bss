import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { withSystem } from "@/server/db";
import { can, ROLE_LABEL, type Role } from "@/domain/permissions";
import { PLANS } from "@/domain/plans";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/cn";
import { configuredProviders } from "@/server/modules/messaging";
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
  "professional.activated": "Profissional reativada", "professional.deactivated": "Profissional desativada", "account.deletion_requested": "Exclusão de conta solicitada",
};

export default async function SettingsPage() {
  const ctx = await requireAppContext("settings.manage");
  const tz = ctx.org.timezone;
  const { org, auditRows, members } = await tenant(ctx, async (tx) => {
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
    return { org: org!, auditRows, members };
  });
  // Nomes de usuárias: tabela de identidade só é lida no contexto de sistema, filtrando pelos membros desta organização.
  const ids = [...new Set([...members.map((m) => m.user_id), ...auditRows.map((a) => a.actor_user_id).filter(Boolean) as string[]])];
  const names = new Map((ids.length ? await withSystem((tx) => tx<{ id: string; full_name: string; email: string }[]>`select id, full_name, email from app.users where id in ${tx(ids)}`) : []).map((u) => [u.id, u]));
  const providers = configuredProviders();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const sub = ctx.subscription;

  return (
    <div>
      <PageHeader title="Configurações" description="Tudo do seu negócio num lugar só: dados, regras de agendamento, plano e privacidade." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <OrganizationForm org={org} readOnly={ctx.access === "read_only"} />
        </div>
        <div className="flex flex-col gap-6">
          <Card data-theme="dark" className="bg-royal ring-glass relative overflow-hidden border-transparent p-5 text-white">
            <h2 className="text-[15px] font-semibold">Página de agendamento</h2>
            <p className="mt-1 mb-3 text-xs text-white/65">{org.online_booking_enabled ? "No ar: as clientes já podem marcar pelo seu link. ✨" : "Pausada: o seu link avisa que o agendamento online está fechado por enquanto."}</p>
            <CopyLink url={`${appUrl}/b/${ctx.org.slug}`} />
          </Card>

          <Card id="assinatura">
            <CardHeader title="Assinatura" description={sub.status === "trialing" && sub.trialEndsAt ? `Teste gratuito até ${formatInTz(sub.trialEndsAt, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}` : undefined}
              action={<Badge variant={ctx.access === "full" ? "success" : ctx.access === "grace" ? "warning" : "danger"}>{{ trialing: "Em teste", active: "Ativa", past_due: "Pagamento pendente", canceled: "Cancelada" }[sub.status]}</Badge>} />
            <div className="px-5 pt-3 pb-5">
              <ul className="flex flex-col gap-2">
                {Object.values(PLANS).map((p) => (
                  <li key={p.id} className={cn("rounded-lg border px-3 py-2 text-sm", ctx.plan.id === p.id ? "border-accent bg-accent-subtle" : "border-line")}>
                    <div className="flex items-center justify-between font-medium">{p.name}{ctx.plan.id === p.id && <Badge variant="plum">Atual</Badge>}</div>
                    <div className="text-xs text-muted">{p.tagline} · até {plural(p.maxProfessionals, "profissional", "profissionais")} · {plural(p.maxUnits, "unidade")}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Os planos pagos ainda estão chegando. Durante o teste você usa tudo de graça e nada é cobrado.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Canais de mensagem" description="Para mandar lembretes e confirmações sozinha" />
            <ul className="px-5 pt-3 pb-5 text-sm">
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

          <Card>
            <CardHeader title="Equipe com acesso" description="Convites por e-mail chegam em breve 💌" />
            <ul className="divide-y divide-line px-5 pt-2 pb-4 text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between py-2">
                  <span className="min-w-0 truncate">{names.get(m.user_id)?.full_name ?? "—"}<span className="block truncate text-xs text-muted">{names.get(m.user_id)?.email}</span></span>
                  <Badge>{ROLE_LABEL[m.role]}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {auditRows.length > 0 && (
            <Card>
              <CardHeader title="Atividades recentes" description="Registro de auditoria" />
              <ul className="divide-y divide-line px-5 pt-2 pb-4 text-[13px]">
                {auditRows.map((a, i) => (
                  <li key={i} className="py-2">
                    <div>{ACTION_LABEL[a.action] ?? a.action}</div>
                    <div className="text-xs text-muted">{a.actor_user_id ? names.get(a.actor_user_id)?.full_name ?? "—" : "Seu link de agendamento"} · {formatInTz(a.created_at, tz, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
