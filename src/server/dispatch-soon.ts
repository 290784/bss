import { after } from "next/server";
import { getSql } from "@/server/db";
import { configuredProviders, dispatchDueMessages } from "@/server/modules/messaging";

/**
 * Entrega as mensagens que ficaram na fila nesta ação (ex.: confirmação de um horário recém-marcado)
 * logo depois da resposta, sem esperar a rotina diária. Sem conexão (própria ou da plataforma), a mensagem é anotada como não enviada.
 */
export function dispatchSoon() {
  after(async () => { await dispatchDueMessages(getSql(), configuredProviders()).catch(() => {}); });
}
