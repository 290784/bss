import type { Metadata } from "next";
import { requireAppContext, tenant } from "@/server/context";
import { listServices, serviceStats } from "@/server/modules/catalog";
import { can } from "@/domain/permissions";
import { listProfessionals } from "@/server/modules/team";
import { PageHeader } from "@/components/ui/primitives";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const ctx = await requireAppContext("services.manage");
  const { services, professionals, stats } = await tenant(ctx, async (tx) => ({
    services: await listServices(tx, ctx.org.id),
    professionals: await listProfessionals(tx, ctx.org.id, { activeOnly: true }),
    stats: await serviceStats(tx, ctx.org.id),
  }));
  return (
    <div>
      <PageHeader title="Serviços" description="Seu cardápio de serviços: preço, duração, tempinho de preparo e quem faz cada um." />
      <ServicesManager stats={can(ctx.role, "finance.view") ? stats : Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { ...v, revenue30: 0 }]))} readOnly={ctx.access === "read_only"} services={services} professionals={professionals.map((p) => ({ id: p.id, name: p.display_name }))} />
    </div>
  );
}
