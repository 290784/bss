/**
 * Definições oficiais das métricas exibidas no produto (usadas nos tooltips "ⓘ").
 * Qualquer número novo no painel precisa de uma entrada aqui.
 */
export const METRIC_DEFINITIONS = {
  revenue_received:
    "Soma dos pagamentos registrados no período (data do pagamento), descontados os estornos. Não inclui valores apenas agendados.",
  scheduled_value:
    "Valor dos atendimentos com início no período e status aguardando, confirmado ou concluído (preço − desconto). É uma previsão, não dinheiro recebido.",
  receivable:
    "Atendimentos concluídos cujo valor (preço − desconto) ainda não foi totalmente pago. Considera pagamentos menos estornos.",
  produced_value:
    "Valor (preço − desconto) dos atendimentos concluídos no período, pagos ou não. Base para comissões.",
  appointments_count: "Atendimentos com início no período, exceto cancelados.",
  no_shows: "Atendimentos do período marcados como falta.",
  no_show_rate: "Faltas ÷ (concluídos + faltas) do período. Mostra quanto do que deveria acontecer não aconteceu.",
  occupancy:
    "Minutos ocupados por atendimentos ativos ÷ minutos de expediente cadastrados das profissionais ativas no período. Bloqueios reduzem o expediente.",
  average_ticket: "Receita recebida ÷ número de atendimentos concluídos no período.",
  new_clients: "Clientes cujo primeiro atendimento concluído aconteceu no período.",
  returning_clients: "Clientes com atendimento concluído no período que já tinham um atendimento concluído antes.",
  inactive_clients:
    "Clientes com pelo menos um atendimento concluído, sem visita há mais de 60 dias e sem agendamento futuro.",
} as const;

export type MetricKey = keyof typeof METRIC_DEFINITIONS;

/** Variação percentual com tratamento explícito de base zero. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
