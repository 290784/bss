import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updated="27/10/2026">
      <h2>1. O serviço</h2>
      <p>A Gê é uma plataforma de gestão para negócios de beleza e estética, oferecida como serviço por assinatura (SaaS), incluindo agenda, cadastro de clientes, agendamento online e indicadores.</p>
      <h2>2. Conta e responsabilidades</h2>
      <p>Você é responsável pela veracidade dos dados informados, pela guarda da sua senha e pelas ações realizadas pela sua equipe na plataforma. Ao cadastrar dados de clientes, você declara ter base legal para tratá-los e se compromete a respeitar a LGPD.</p>
      <h2>3. Período de teste e planos</h2>
      <p>Novas contas têm um período de teste gratuito. Planos, limites e preços podem ser alterados com aviso prévio. Sem assinatura ativa após o teste, a conta passa para modo somente leitura: os dados continuam disponíveis para consulta e exportação.</p>
      <h2>4. Pagamentos registrados</h2>
      <p>Os lançamentos financeiros na plataforma são registros informados pelo estabelecimento. A Gê não processa pagamentos das clientes finais, salvo integração expressamente contratada e ativada.</p>
      <h2>5. Mensagens</h2>
      <p>O envio de mensagens depende da conexão de canais oficiais e do cumprimento das regras de cada provedor. É proibido o uso para envio de mensagens não solicitadas.</p>
      <h2>6. Disponibilidade</h2>
      <p>Empregamos esforços razoáveis para manter o serviço disponível e seguro, com backups periódicos, mas não garantimos funcionamento ininterrupto.</p>
      <h2>7. Encerramento</h2>
      <p>Você pode cancelar a qualquer momento. Antes do encerramento definitivo, poderá exportar seus dados.</p>
      <h2>8. Contato</h2>
      <p>Dúvidas: pelo canal de contato informado no site.</p>
    </LegalPage>
  );
}
