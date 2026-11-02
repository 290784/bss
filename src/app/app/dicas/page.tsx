import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAppContext, tenant } from "@/server/context";
import { can } from "@/domain/permissions";
import { METRIC_DEFINITIONS } from "@/domain/metrics";
import { loadDashboard } from "@/server/modules/dashboard";
import { loadDicas } from "@/server/modules/dicas";
import { Card, CardHeader, EmptyState, InfoTip, PageHeader } from "@/components/ui/primitives";
import { formatInTz } from "@/lib/time";
import { plural } from "@/lib/text";
import { DicasCard } from "../dicas-card";

export const metadata: Metadata = { title: "Dicas" };

/** Dicas: o que fazer para faturar mais e quem chamar de volta, separado do Início. */
export default async function DicasPage() {
  const ctx = await requireAppContext();
  if (!can(ctx.role, "dashboard.view")) redirect("/app/agenda");
  const tz = ctx.org.timezone;
  const finance = can(ctx.role, "finance.view");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const { dicas, reactivate } = await tenant(ctx, async (tx) => {
    const [dicas, d] = await Promise.all([
      loadDicas(tx, ctx.org.id, tz, { finance, bookingUrl: `${appUrl}/b/${ctx.org.slug}` }),
      loadDashboard(tx, ctx.org.id, tz, "month", { includeFinance: false }),
    ]);
    return { dicas, reactivate: d.reactivate };
  });

  return (
    <div>
      <PageHeader art="lightbulb" title="Dicas" description="Ideias para encher a agenda e chamar de volta quem sumiu. Marque como feita quando resolver." />

      <DicasCard dicas={dicas} />

      <Card className="mt-6">
        <CardHeader art="heart" title="Clientes com saudade" description="Mais de 60 dias sem vir e sem horário marcado: hora de mandar um oi"
          action={<InfoTip text={METRIC_DEFINITIONS.inactive_clients} />} />
        <div className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
          {reactivate.length === 0 ? (
            <EmptyState className="py-6" art="heart" title="Ninguém sumida por aqui" description="Se alguma cliente ficar mais de 60 dias sem voltar, ela aparece aqui para você chamar." />
          ) : (
            <ul className="divide-y divide-line/70">
              {reactivate.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/clientes/${c.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 text-sm transition hover:bg-hover-tint active:scale-[0.99]">
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-right text-xs text-muted">{plural(c.visits, "visita")} · última em {formatInTz(c.last_visit, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
