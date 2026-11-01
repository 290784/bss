import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { listProfessionals, listTimeOff, teamStats } from "@/server/modules/team";
import { can } from "@/domain/permissions";
import { formatInTz } from "@/lib/time";
import { listServices } from "@/server/modules/catalog";
import { PageHeader } from "@/components/ui/primitives";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Equipe e horários" };

export default async function TeamPage() {
  const ctx = await requireAppContext("team.manage");
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
      <PageHeader title="Equipe e horários" description={`${active} de ${ctx.plan.maxProfessionals} ${ctx.plan.maxProfessionals === 1 ? "profissional ativa" : "profissionais ativas"} no plano ${ctx.plan.name}${ctx.subscription.status === "trialing" ? " (teste)" : ""}.`} />
      <TeamManager
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
