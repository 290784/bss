import type { Tx } from "@/server/db";
import { localDateKey, localTime } from "@/lib/time";

const MAX_LINHAS = 20000;
const isKey = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Período do pedido (?de=AAAA-MM-DD&ate=AAAA-MM-DD). Sem período: os últimos 12 meses até hoje, no fuso da empresa. */
export function periodoDaExportacao(params: URLSearchParams, timeZone: string, now = new Date()) {
  const hoje = localDateKey(now, timeZone);
  const ate = isKey(params.get("ate")) ? params.get("ate")! : hoje;
  const [y, m, d] = ate.split("-").map(Number) as [number, number, number];
  const de = isKey(params.get("de")) ? params.get("de")! : `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { de, ate };
}

const STATUS: Record<string, string> = { pending: "pendente", confirmed: "confirmado", completed: "concluído", cancelled: "cancelado", no_show: "faltou" };
const FORMA: Record<string, string> = { pix: "Pix", cash: "dinheiro", credit_card: "cartão de crédito", debit_card: "cartão de débito", bank_transfer: "transferência", other: "outra" };

export type LinhaAgenda = { data: string; inicio: string; fim: string; status: string; cliente: string; telefone: string | null; profissional: string; servicos: string; valorCents: number; origem: string; motivoCancelamento: string | null };

/** Atendimentos do período (início entre `de` e `ate`, no fuso da empresa), do mais antigo ao mais novo. */
export async function exportarAgenda(tx: Tx, orgId: string, timeZone: string, de: string, ate: string): Promise<LinhaAgenda[]> {
  const rows = await tx<{ starts_at: Date; ends_at: Date; status: string; client_name: string | null; client_phone: string | null; professional_name: string | null; services: string | null; price_cents: number; discount_cents: number; source: string; cancel_reason: string | null }[]>`
    select a.starts_at, a.ends_at, a.status::text, c.full_name as client_name, c.phone_normalized as client_phone, p.display_name as professional_name,
      (select string_agg(s.service_name, ' + ' order by s.position) from app.appointment_services s where s.organization_id = a.organization_id and s.appointment_id = a.id) as services,
      a.price_cents, a.discount_cents, a.source::text, a.cancel_reason
    from app.appointments a
    left join app.clients c on c.organization_id = a.organization_id and c.id = a.client_id
    left join app.professionals p on p.organization_id = a.organization_id and p.id = a.professional_id
    where a.organization_id = ${orgId}
      and (a.starts_at at time zone ${timeZone})::date between ${de}::date and ${ate}::date
    order by a.starts_at limit ${MAX_LINHAS}`;
  return rows.map((r) => ({
    data: localDateKey(r.starts_at, timeZone), inicio: localTime(r.starts_at, timeZone), fim: localTime(r.ends_at, timeZone),
    status: STATUS[r.status] ?? r.status, cliente: r.client_name ?? "", telefone: r.client_phone, profissional: r.professional_name ?? "",
    servicos: r.services ?? "", valorCents: r.price_cents - r.discount_cents, origem: r.source === "online" ? "online" : "equipe", motivoCancelamento: r.cancel_reason,
  }));
}

export type LinhaPagamento = { data: string; hora: string; tipo: string; valorCents: number; forma: string; sinal: boolean; cliente: string; observacao: string | null };

/** Pagamentos e estornos do período (data do pagamento, no fuso da empresa). Estorno sai com valor negativo. */
export async function exportarPagamentos(tx: Tx, orgId: string, timeZone: string, de: string, ate: string): Promise<LinhaPagamento[]> {
  const rows = await tx<{ paid_at: Date; kind: string; amount_cents: number; method: string; is_deposit: boolean; client_name: string | null; notes: string | null }[]>`
    select p.paid_at, p.kind::text, p.amount_cents, p.method::text, p.is_deposit, c.full_name as client_name, p.notes
    from app.payments p left join app.clients c on c.organization_id = p.organization_id and c.id = p.client_id
    where p.organization_id = ${orgId} and (p.paid_at at time zone ${timeZone})::date between ${de}::date and ${ate}::date
    order by p.paid_at limit ${MAX_LINHAS}`;
  return rows.map((r) => ({
    data: localDateKey(r.paid_at, timeZone), hora: localTime(r.paid_at, timeZone), tipo: r.kind === "refund" ? "estorno" : "pagamento",
    valorCents: r.kind === "refund" ? -r.amount_cents : r.amount_cents, forma: FORMA[r.method] ?? r.method, sinal: r.is_deposit, cliente: r.client_name ?? "", observacao: r.notes,
  }));
}
