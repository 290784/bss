import type { Profissional, Servico, Studio } from "@/data/types";
import { formatarDuracao, formatarValor } from "@/utils/format";

/**
 * Camada de agendamento. Fase 1: o pedido termina no WhatsApp do studio com a mensagem pronta.
 * Fase 2 (agenda real — Google Calendar, Supabase…): implementar outro BookingProvider com
 * `disponibilidade()` e `reservar()` e trocar `provedorAtual` — as páginas não mudam.
 */
export type PedidoAgendamento = { servico: Servico; profissional: Profissional };

export interface BookingProvider {
  readonly tipo: "whatsapp";
  /** Destino para concluir o pedido (na fase 1, o link do WhatsApp). */
  concluir(pedido: PedidoAgendamento): { url: string; mensagem: string };
}

export function montarMensagem(modelo: string, pedido: PedidoAgendamento) {
  return modelo
    .replaceAll("{servico}", pedido.servico.nome)
    .replaceAll("{duracao}", formatarDuracao(pedido.servico.duracaoMin))
    .replaceAll("{valor}", formatarValor(pedido.servico.precoCentavos))
    .replaceAll("{profissional}", pedido.profissional.nome);
}

export function linkWhatsApp(studio: Pick<Studio, "contato">, texto?: string) {
  const { ddi, numero } = studio.contato.whatsapp;
  return `https://wa.me/${ddi}${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function criarProvedorWhatsApp(studio: Studio): BookingProvider {
  return {
    tipo: "whatsapp",
    concluir(pedido) {
      const mensagem = montarMensagem(studio.agendamento.mensagemWhatsApp, pedido);
      return { url: linkWhatsApp(studio, mensagem), mensagem };
    },
  };
}
