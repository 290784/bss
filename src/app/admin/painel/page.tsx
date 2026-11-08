import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { ATIVACAO_DIAS, loadFounderKpis } from "@/server/modules/founder-kpis";
import { BUSINESS_TYPES } from "@/server/modules/catalog";
import { CONHECEU } from "@/domain/canal";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Painel do fundador", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { trialing: "Em teste grátis", active: "Pagando", past_due: "Pagamento pendente", canceled: "Canceladas" };
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: string | number; nota?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="text-[13px] text-muted">{rotulo}</div>
      <div className="mt-1 font-serif text-3xl font-semibold">{valor}</div>
      {nota && <div className="mt-0.5 text-xs text-muted">{nota}</div>}
    </div>
  );
}

/** Equipe da Gê: números de aquisição e ativação, direto do banco. Acesso só de administradora da plataforma. */
export default async function PainelFundadorPage() {
  await requirePlatformAdmin();
  const k = await withSystem((tx) => loadFounderKpis(tx));
  const tipo = (id: string) => BUSINESS_TYPES.find((b) => b.id === id)?.label ?? id;
  const conheceu = (id: string) => CONHECEU.find((c) => c.id === id)?.label ?? id;
  const f = k.funil;
  const etapas = [
    ["Se cadastraram", f.cadastros], ["Criaram o negócio", f.criaramNegocio], ["Concluíram o onboarding", f.concluiramOnboarding], [`Criaram um atendimento em até ${ATIVACAO_DIAS} dias`, f.ativadas],
  ] as const;
  return (
    <main data-app className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader art="chart" title="Painel do fundador" description="De onde vêm os cadastros e quem está ativando. Os números são do banco, ao vivo." />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero rotulo="Cadastros (30 dias)" valor={k.cadastros.ultimos30} nota={`${k.cadastros.ultimos7} nos últimos 7 · ${k.cadastros.total} no total`} />
          <Numero rotulo="Ativação (30 dias)" valor={pct(f.ativadas, f.cadastros)} nota={`${f.ativadas} de ${f.cadastros} cadastros`} />
          <Numero rotulo="Lista de espera" valor={k.listaEspera.total} nota={`${k.listaEspera.ultimos7} nos últimos 7`} />
          <Numero rotulo="Reservas online (7 dias)" valor={k.reservasOnline.ultimos7} nota={`${k.reservasOnline.ultimos30} em 30 dias`} />
        </div>

        <Card>
          <CardHeader title="Funil dos últimos 30 dias" description="Cada etapa, e quanto sobra do cadastro" />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {etapas.map(([nome, v]) => <li key={nome} className="flex items-center justify-between py-3 text-sm"><span>{nome}</span><span><b>{v}</b> <span className="text-muted">({pct(v, f.cadastros)})</span></span></li>)}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Cadastros por canal (30 dias)" description="Código do link e resposta de “como conheceu”. Veja os códigos em materiais-comerciais/CODIGOS-DE-CANAL.md" />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {k.porCanal.length === 0 && <li className="py-4 text-sm text-muted">Nenhum cadastro no período.</li>}
            {k.porCanal.map((c) => <li key={`${c.canal}|${c.conheceu}`} className="flex items-center justify-between py-3 text-sm"><span>{c.canal} <span className="text-muted">· {conheceu(c.conheceu)}</span></span><b>{c.cadastros}</b></li>)}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Contas em risco" description="Cadastradas há 3 a 30 dias e sem nenhum atendimento. Vale uma mensagem pessoal." />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {k.contasEmRisco.length === 0 && <li className="py-4 text-sm text-muted">Nenhuma conta parada.</li>}
            {k.contasEmRisco.map((o) => <li key={o.orgId} className="py-3 text-sm"><b>{o.nome}</b> <span className="text-muted">· {o.email ?? "sem e-mail"} · há {o.diasDesdeCadastro} dias</span></li>)}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Contas que pararam" description="Já usaram a agenda, mas faz 14 dias ou mais sem horário novo. Vale perguntar o que travou." />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {k.contasParadas.length === 0 && <li className="py-4 text-sm text-muted">Nenhuma conta parada.</li>}
            {k.contasParadas.map((o) => <li key={o.orgId} className="py-3 text-sm"><b>{o.nome}</b> <span className="text-muted">· {o.email ?? "sem e-mail"} · há {o.diasParada} dias sem horário novo</span></li>)}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Lista de espera por atividade" description="" />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {k.listaEspera.porTipo.length === 0 && <li className="py-4 text-sm text-muted">Ninguém na lista.</li>}
            {k.listaEspera.porTipo.map((t) => <li key={t.tipo} className="flex items-center justify-between py-3 text-sm"><span>{tipo(t.tipo)}</span><b>{t.pessoas}</b></li>)}
          </ul>
          <p className="px-5 pb-4 text-sm sm:px-6"><Link className="underline" href="/admin/lista-de-espera">Ver a lista com os WhatsApps</Link></p>
        </Card>

        <Card>
          <CardHeader title="Assinaturas (contas reais)" description="Ainda sem cobrança: tudo é teste grátis até a P-09" />
          <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
            {k.assinaturas.length === 0 && <li className="py-4 text-sm text-muted">Nenhuma conta ainda.</li>}
            {k.assinaturas.map((a) => <li key={a.status} className="flex items-center justify-between py-3 text-sm"><span>{STATUS[a.status] ?? a.status}</span><b>{a.contas}</b></li>)}
          </ul>
        </Card>
      </div>
    </main>
  );
}
