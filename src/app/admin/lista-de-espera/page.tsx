import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/server/admin";
import { withSystem } from "@/server/db";
import { BUSINESS_TYPES } from "@/server/modules/catalog";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { formatInTz } from "@/lib/time";
import { formatPhone } from "@/lib/text";

export const metadata: Metadata = { title: "Lista de espera", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Equipe da Gê: quem pediu para testar pela landing. Cada pessoa aceitou ser chamada no WhatsApp. */
export default async function ListaDeEsperaPage() {
  await requirePlatformAdmin();
  const rows = await withSystem((tx) => tx<{ full_name: string; phone: string; business_type: string; canal: string | null; created_at: Date }[]>`
    select full_name, phone, business_type, canal, created_at from app.waitlist order by created_at desc limit 500`);
  const tipo = (id: string) => BUSINESS_TYPES.find((b) => b.id === id)?.label ?? id;
  return (
    <main data-app className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader art="user-plus" title="Lista de espera" description="Quem pediu para testar pela landing, da mais recente para a mais antiga." />
      <Card>
        <CardHeader title={`Pedidos (${rows.length})`} description="Chame pelo WhatsApp e marque na planilha" />
        <ul className="divide-y divide-line/70 px-5 pb-4 sm:px-6">
          {rows.length === 0 && <li className="py-4 text-sm text-muted">Ninguém na lista ainda.</li>}
          {rows.map((r) => (
            <li key={r.phone} className="py-3">
              <div className="font-semibold">{r.full_name} <span className="text-xs font-normal text-muted">· {tipo(r.business_type)}</span></div>
              <div className="text-xs text-muted">
                <a className="underline" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer">{formatPhone(r.phone)}</a>
                {r.canal && <> · canal {r.canal}</>} · {formatInTz(r.created_at, "America/Sao_Paulo", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
