/**
 * Definições oficiais das métricas exibidas no produto (usadas nos tooltips "ⓘ").
 * Qualquer número novo no painel precisa de uma entrada aqui.
 */
export const METRIC_DEFINITIONS = {
  revenue_received:
    "Tudo o que entrou no caixa no período (pela data do pagamento), já tirando os estornos. O que só está agendado não entra aqui.",
  scheduled_value:
    "Soma dos atendimentos do período que estão aguardando, confirmados ou feitos (preço − desconto). É uma previsão: ainda não é dinheiro no caixa.",
  receivable:
    "Atendimentos já feitos que ainda não foram pagos por completo (preço − desconto, menos o que já entrou).",
  produced_value:
    "Valor dos atendimentos feitos no período (preço − desconto), pagos ou não. É a base para comissões.",
  appointments_count: "Atendimentos marcados para o período, sem contar os cancelados.",
  no_shows: "Clientes que tinham horário no período e não vieram.",
  no_show_rate: "Faltas ÷ (feitos + faltas) no período: de quem tinha horário, quantas não vieram.",
  occupancy:
    "Quanto do horário de atendimento das profissionais está ocupado com clientes no período. Bloqueios (folgas, compromissos) não contam como horário disponível.",
  average_ticket: "Quanto entrou no caixa ÷ atendimentos feitos no período: em média, quanto cada cliente deixa.",
  new_clients: "Clientes que vieram pela primeira vez neste período.",
  returning_clients: "Clientes que já tinham vindo antes e voltaram neste período.",
  inactive_clients:
    "Clientes que já vieram, estão há mais de 60 dias sem aparecer e não têm horário marcado.",
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
