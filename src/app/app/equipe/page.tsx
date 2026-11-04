import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { listProfessionals, listTimeOff, teamStats } from "@/server/modules/team";
import { can } from "@/domain/permissions";
import { formatInTz } from "@/lib/time";
import { listServices } from "@/server/modules/catalog";
import { Accent, B, PageHeader } from "@/components/ui/primitives";
import { SubTabs } from "@/components/ui/sub-tabs";
import { CalendarOff, UsersRound, Wallet } from "lucide-react";
import { TeamManager, type TeamTab } from "./team-manager";

export const metadata: Metadata = { title: "Equipe e horários" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const ctx = await requireAppContext("team.manage");
  const { aba } = await searchParams;
  const tab: TeamTab = aba === "folgas" || aba === "resumo" ? aba : "profissionais";
  const data = await tenant(ctx, async (tx) => ({
    professionals: await listProfessionals(tx, ctx.org.id),
    services: await listServices(tx, ctx.org.id, { activeOnly: true }),
    timeOff: await listTimeOff(tx, ctx.org.id, new Date()),
    stats: await teamStats(tx, ctx.org.id, ctx.org.timezone),
  }));
  const finance = can(ctx.role, "finance.view");
  const active = data.professionals.filter((p) => p.is_active).length;
  return (
    <div>
      <PageHeader art="calendar-check" title="Equipe e horários" description={<><Accent>{active} de {ctx.plan.maxProfessionals} {ctx.plan.maxProfessionals === 1 ? "profissional ativa" : "profissionais ativas"}</Accent> no plano <B>{ctx.plan.name}</B>{ctx.subscription.status === "trialing" ? " (teste)" : ""}.</>} />
      <SubTabs label="Partes da equipe" current={tab} href={(id) => (id === "profissionais" ? "/app/equipe" : `/app/equipe?aba=${id}`)}
        tabs={[
          { id: "profissionais", label: "Profissionais", icon: UsersRound, count: data.professionals.length },
          { id: "folgas", label: "Folgas e feriados", icon: CalendarOff, count: data.timeOff.length },
          ...(finance ? [{ id: "resumo", label: "Resumo do mês", icon: Wallet }] : []),
        ]} />
      <TeamManager
        tab={tab}
        readOnly={ctx.access === "read_only"}
        finance={finance}
        monthLabel={formatInTz(new Date(), ctx.org.timezone, { month: "long" })}
        stats={finance ? data.stats : Object.fromEntries(Object.entries(data.stats).map(([k, v]) => [k, { ...v, revenue: 0, commission: 0 }]))}
        timeZone={ctx.org.timezone}
        atLimit={active >= ctx.plan.maxProfessionals}
        professionals={data.professionals.map((p) => ({ ...p, commission_percent: Number(p.commission_percent) }))}
        services={data.services.map((s) => ({ id: s.id, name: s.name }))}
        timeOff={data.timeOff.map((t) => ({ ...t, starts_at: t.starts_at.toISOString(), ends_at: t.ends_at.toISOString() }))}
      />
    </div>
  );
}
