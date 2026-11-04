import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ToastProvider } from "@/components/ui/toast";
import { formatInTz } from "@/lib/time";
import { AdminConnectForm, AdminDisconnect } from "./connect-form";

export const metadata: Metadata = { title: "WhatsApp dos clientes", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Equipe da Gê: pedidos de conexão de WhatsApp e quem já está conectado. Acesso só por PLATFORM_ADMIN_EMAILS. */
export default async function AdminWhatsAppPage() {
  await requirePlatformAdmin();
  const { pedidos, conectados } = await withSystem(async (tx) => ({
    pedidos: await tx<{ organization_id: string; name: string; slug: string; phone: string; requested_at: Date; owner_email: string | null }[]>`
      select r.organization_id, o.name, o.slug, r.phone, r.requested_at,
        (select u.email from app.memberships m join app.users u on u.id = m.user_id where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1) as owner_email
      from app.whatsapp_requests r join app.organizations o on o.id = r.organization_id order by r.requested_at`,
    conectados: await tx<{ organization_id: string; name: string; slug: string; display_phone: string | null; templates: Record<string, string>; verify_token: string }[]>`
      select c.organization_id, o.name, o.slug, c.display_phone, c.templates, c.verify_token
      from app.whatsapp_connections c join app.organizations o on o.id = c.organization_id order by c.connected_at desc`,
  }));
  return (
    <ToastProvider>
      <main data-app className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader art="chat" title="WhatsApp dos clientes" description="Pedidos de conexão e números já conectados. Na chamada com o cliente, cole os dados da Meta aqui." />
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={`Pedidos (${pedidos.length})`} description="O cliente tocou em “Quero conectar meu WhatsApp”" />
            <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
              {pedidos.length === 0 && <li className="py-4 text-sm text-muted">Nenhum pedido no momento.</li>}
              {pedidos.map((p) => (
                <li key={p.organization_id} className="py-4">
                  <div className="font-semibold">{p.name} <span className="text-xs font-normal text-muted">/{p.slug}</span></div>
                  <div className="text-xs text-muted">WhatsApp: {p.phone} · {p.owner_email ?? "sem e-mail"} · pediu em {formatInTz(p.requested_at, "America/Sao_Paulo", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                  <details className="mt-3 rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">Conectar agora</summary><div className="mt-3"><AdminConnectForm org={p.slug} /></div></details>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title={`Conectados (${conectados.length})`} />
            <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
              {conectados.length === 0 && <li className="py-4 text-sm text-muted">Ninguém conectado ainda.</li>}
              {conectados.map((c) => (
                <li key={c.organization_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0"><div className="font-semibold">{c.name}</div><div className="text-xs text-muted">{c.display_phone ?? "—"} · {Object.entries(c.templates).map(([k, v]) => `${k.replace("ge_", "")}: ${v}`).join(" · ") || "sem modelos"}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted">Webhook: /api/whatsapp/webhook · verificação: {c.verify_token}</div></div>
                  <AdminDisconnect orgId={c.organization_id} />
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Conectar outro estabelecimento" description="Sem pedido prévio: informe o código do link do salão" />
            <div className="px-5 pt-3 pb-5 sm:px-6"><AdminConnectForm /></div>
          </Card>
        </div>
      </main>
    </ToastProvider>
  );
}
