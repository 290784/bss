import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updated="27/10/2026">
      <p>Esta política explica como a Gê trata dados pessoais, em linha com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>
      <h2>Papéis</h2>
      <p>Para os dados das <strong>clientes finais</strong> (pessoas atendidas pelos estabelecimentos), o estabelecimento é o controlador e a Gê atua como operador, tratando os dados conforme as instruções do estabelecimento. Para os dados das <strong>usuárias da plataforma</strong> (profissionais e equipes), a Gê é o controlador.</p>
      <h2>Dados tratados</h2>
      <ul>
        <li>Usuárias: nome, e-mail, senha (armazenada apenas como hash), registros de acesso e ações relevantes (auditoria).</li>
        <li>Clientes finais: nome, telefone, e-mail, data de nascimento (opcional), histórico de agendamentos e pagamentos registrados, preferências de atendimento e consentimentos.</li>
      </ul>
      <h2>Finalidades e bases legais</h2>
      <ul>
        <li>Agendar e gerenciar atendimentos e enviar avisos sobre o agendamento — execução de contrato / procedimentos preliminares.</li>
        <li>Mensagens promocionais — somente com consentimento, que pode ser revogado a qualquer momento.</li>
        <li>Segurança, prevenção a fraudes e auditoria — legítimo interesse e cumprimento de obrigações legais.</li>
      </ul>
      <h2>Dados sensíveis</h2>
      <p>A Gê não coleta, por padrão, dados de saúde (como alergias) nem fotos. Caso o estabelecimento precise registrar esse tipo de informação, deve ter finalidade definida, base legal adequada e restringir o acesso.</p>
      <h2>Compartilhamento</h2>
      <p>Os dados são armazenados em provedores de infraestrutura contratados para hospedagem e banco de dados. Não vendemos dados pessoais. Integrações de mensagens (como WhatsApp e e-mail) só tratam dados quando ativadas pelo estabelecimento.</p>
      <h2>Retenção</h2>
      <p>Os dados são mantidos enquanto a conta estiver ativa. Após o encerramento, são excluídos ou anonimizados, exceto quando a manutenção for exigida por lei (por exemplo, registros financeiros).</p>
      <h2>Direitos dos titulares</h2>
      <p>É possível solicitar confirmação de tratamento, acesso, correção, portabilidade, eliminação e revogação de consentimento. Clientes finais devem contatar o estabelecimento; usuárias podem usar as opções em Configurações ou escrever para o canal de contato informado no site.</p>
      <h2>Segurança</h2>
      <p>Aplicamos isolamento de dados entre empresas no próprio banco de dados, controle de acesso por papel, senhas com hash, limites contra abuso e registro de auditoria das operações críticas.</p>
    </LegalPage>
  );
}
