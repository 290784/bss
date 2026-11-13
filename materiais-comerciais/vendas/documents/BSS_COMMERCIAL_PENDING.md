# Pendências comerciais, inconsistências e decisões a confirmar

Este é o documento mais importante do material de vendas: lista o que **falta definir** ou **não bate** entre o código, a landing e a estratégia. Tudo o que está aqui foi tratado nos materiais com **placeholder visível** ou com **texto honesto**, e não com informação inventada.

Fonte de verdade usada: `src/domain/plans.ts`, a landing (`src/app/page.tsx`), o README, `docs/ROADMAP.md`, `LAUNCH_TRACKER.md` e os materiais comerciais existentes. Auditoria feita em 13/11/2026.

## A. Nome do produto
| # | Achado | Como tratei | Decisão sua |
| --- | --- | --- | --- |
| A1 | **"BSS" não é um nome definido no projeto.** Não existe "Beauty Sales System" nem "Business Sales System" em nenhum arquivo. BSS é só o nome do repositório e do projeto na Vercel. O produto chama-se **Gê** (README, landing, app). | Todo o material fala em **Gê**. Mantive os nomes de arquivo pedidos (`BSS_*`) porque você os definiu. | Confirmar que o produto é a Gê e se quer renomear os arquivos. |

## B. Preços e condições (nada disso existe oficialmente)
| # | Achado | Como tratei | Decisão sua |
| --- | --- | --- | --- |
| B1 | **Os preços dos planos não estão definidos.** O código diz "hipóteses comerciais (preços não definidos)"; a landing diz "Preço em definição"; a FAQ diz "os preços ainda estão sendo definidos". | O slide de investimento mostra a **condição oficial** (teste grátis de 14 dias, sem cartão, aviso antes de qualquer cobrança). Os preços ficam em `presentation/dados-comerciais.js` (campos vazios). | **C-01:** definir o preço inicial. Eu havia sugerido testar R$ 49, R$ 69 e R$ 89 (V-08); **são hipóteses de teste, não preços oficiais**. |
| B2 | **Formas de pagamento não definidas.** A cobrança recorrente não está integrada (P-09). Pix e cartão aparecem como intenção no tracker. | Slide de investimento diz "a definir"; nada é prometido. | **F-01:** escolher o provedor de cobrança. |
| B3 | **Oferta de fundadora e beta:** citadas na estratégia (beta com 15 vagas, preço de fundadora), mas **não existem como oferta** ainda. | Não aparecem nos slides nem nos scripts como fato. Os scripts têm um bloco opcional, claramente marcado, para quando existir. | **C-02:** decidir se haverá e em que condições. |
| B4 | **Ciclo anual:** o banco aceita `billing_cycle = yearly`, mas **não há oferta anual definida**. | O playbook de upsell trata "plano anual" como **sugestão futura**, separada das ofertas oficiais. | Decidir se haverá plano anual e com que desconto (se houver). |
| B5 | **Complementos (add-ons) e serviços pagos** (por exemplo, configuração assistida ou importação feita pela equipe): **não existem** como produto. | Tratados como **sugestões futuras** no playbook de upsell. A chamada de configuração aparece como etapa do onboarding, **sem preço**. | Decidir se algum será cobrado. |
| B6 | **Política de cancelamento, reembolso e fim do teste:** não encontrei documento. O sistema faz: teste de 14 dias; depois, acesso só para consulta e exportação (sem novos agendamentos) se não houver plano ativo; nunca apaga dados. | Só descrevo o que o sistema faz (modo de consulta). Nada sobre reembolso. | Definir política de cancelamento e reembolso, e o que acontece no dia 15 do teste. |

## C. Planos: o que está no código e o que o sistema realmente aplica
Planos oficiais (em `src/domain/plans.ts`): **Solo, Pro, Studio, Business**.

| # | Achado | Como tratei |
| --- | --- | --- |
| C1 | **Aplicado pelo sistema hoje:** (1) limite de **profissionais ativas** por plano (1, 2, 10, 100); (2) **automações de WhatsApp** só nos planos Pro, Studio e Business (e durante o teste). | Estas são as diferenças que eu **uso como argumento** de upgrade. |
| C2 | **"Relatórios por profissional"** aparece na landing como recurso de Studio e Business, mas **o recurso existe e está liberado em todos os planos** (a página Relatórios traz "Como está cada profissional" para todas). `reports_advanced` não é bloqueado no código. | Apresento o recurso como parte do produto, **sem usá-lo como barreira** entre Pro e Studio. Decidir se será bloqueado ou se a landing muda. |
| C3 | **"Várias unidades" (Business, até 20 unidades) não existe na interface.** O roadmap diz: "Unidade única na interface; múltiplas unidades na interface: Fase 4". O banco tem o modelo, mas a tela não. | Business aparece como plano **"em desenvolvimento: várias unidades"**, nunca como algo pronto. Não vender Business como disponível. |
| C4 | O limite de unidades (1, 1, 1, 20) **não é aplicado** em lugar nenhum; é só texto. | Idem C3. |
| C5 | **Troca de plano (upgrade):** a tela de Configurações mostra os planos, mas **não há cobrança integrada nem fluxo de autoatendimento** para mudar de plano que eu tenha confirmado. | Os scripts dizem que a mudança "mantém seus dados" e **não prometem autoatendimento**. Confirmar o fluxo real. |
| C6 | Durante o teste, o plano efetivo é o **Studio** (até 10 profissionais, automações). Após o teste, o plano contratado vale. | Dito assim nos materiais. |
| C7 | A landing também mostra "Ilustrações da interface com dados de exemplo". | Os screenshots do deck são **telas reais** do sistema com a conta de demonstração (dados fictícios) e levam a legenda "dados fictícios de demonstração". |

## D. Funcionalidades que dependem de ativação ou ainda não foram provadas
| # | Achado | Como tratei |
| --- | --- | --- |
| D1 | **WhatsApp:** o motor de mensagens e o fluxo (lembrete na véspera, confirmação com toque, oferta de extra) existem, mas **nenhum canal está conectado em produção e nunca foi testado com a Meta real (P-05)**. O salão pede a conexão e a equipe configura numa chamada. | Os materiais dizem **"lembrete pelo WhatsApp do seu negócio, ativado junto com a nossa equipe"**. Nunca digo que já envia para todo mundo. **Não demonstrar envio real** até a P-05 fechar. |
| D2 | **E-mail** (confirmação, recuperação de senha): código pronto, **provedor não escolhido (F-02)**. | Não é argumento de venda. |
| D3 | **Cobrança:** sem integração. Não dá para "fechar e cobrar" ainda. | O "fechamento" dos scripts é **começar o teste e marcar a chamada de configuração**. |
| D4 | Importação de clientes por planilha: pronta (CSV; entram sem consentimento de marketing). | Usada como argumento. |
| D5 | Exportação (clientes, agenda e pagamentos em CSV): pronta. | Usada no slide de segurança. |

## E. Informações que não existem (e por isso não aparecem)
- **Depoimentos, casos de sucesso, números de clientes ou de crescimento:** não existem. Não há nenhum no material. A conta de demonstração conta uma história **fictícia** (de ~R$ 14 mil para ~R$ 17,6 mil por mês), e **ela não pode ser mostrada como resultado real**: é só dado de exemplo. O deck não usa essa história como prova.
- **Concorrentes e comparações de mercado:** não há pesquisa. Os scripts não citam concorrentes pelo nome; tratam "já uso outro sistema" de forma genérica.
- **Suporte:** a estratégia diz que o suporte será **Pedro Chaves** (C-04), mas **canal e horários não foram informados**. O deck diz "suporte da equipe da Gê" e deixa canal e horário em `dados-comerciais.js`.
- **Perfil de Instagram e TikTok da Gê:** não informados (M-05).
- **Prazo de ativação do WhatsApp:** depende da Meta; sem estimativa documentada.
- **Revisão jurídica** de Termos e Privacidade (L-03) e **verificação da empresa** na Meta (L-02): pendentes. **Não divulgar a landing nem este material para o público** antes de L-03.
- **Plano da Vercel:** o projeto está no plano Hobby, que pelos termos não permite uso comercial (ver `docs/DEPLOY.md`). Confirmar antes de cobrar (F-03).

## F. Conflitos entre fontes (e qual venceu)
| Tema | Fontes | Decisão aplicada |
| --- | --- | --- |
| Recursos por plano | Landing (Studio e Business têm "Relatórios por profissional") × código (não bloqueia) | Prevalece o **comportamento real do sistema**; a divergência está em C2. |
| Business | Landing e `plans.ts` ("Várias unidades") × README/roadmap ("unidade única na interface") | Prevalece o **roadmap mais recente**: não está pronto (C3). |
| Preço | Estratégia (testar R$ 49/69/89) × landing e código ("em definição") | Prevalece **"em definição"** (B1). |
| Nome | Pedido ("BSS") × projeto ("Gê") | Prevalece **Gê** (A1). |

## G. O que preciso de você, em ordem
1. **C-01** (preço inicial) e **F-01** (cobrança): sem eles não há slide de investimento completo.
2. Decisão sobre **C2 e C3** (bloquear ou não relatórios por profissional; como tratar Business).
3. **C-04**: canal e horários do suporte.
4. **P-05**: provar o WhatsApp com a Meta, para o deck poder **demonstrar** o lembrete de verdade.
5. **L-03**: revisão da privacidade, antes de qualquer divulgação.
6. Confirmar **A1** (nome) e a política de cancelamento (B6).
