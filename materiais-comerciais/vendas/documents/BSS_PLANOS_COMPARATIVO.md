# Comparativo estratégico dos planos da Gê

**Estado dos planos:** os quatro planos são **hipóteses comerciais** definidas em `src/domain/plans.ts`. **Preços e formas de pagamento não estão definidos** (ver `BSS_COMMERCIAL_PENDING.md`, itens B1 e B2). Onde um valor seria necessário, aparece **[A DEFINIR]**.

**Regra do teste:** durante os 14 dias grátis (sem cartão) a conta usa os recursos do **Studio**. Depois do teste, vale o plano contratado.

## 1. Visão em 30 segundos
| | **Solo** | **Pro** | **Studio** | **Business** |
| --- | --- | --- | --- | --- |
| Papel na escada | Entrada | Intermediário | Avançado (equipes) | Várias unidades |
| Para quem | Atende sozinha | Sozinha ou com 1 ajudante, que quer automatizar | Equipe de até 10 | Rede ou espaço com várias unidades |
| **Profissionais ativas** | 1 | até 2 | até 10 | até 100 |
| **Unidades** | 1 | 1 | 1 | até 20 (**interface em desenvolvimento**) |
| Agenda, clientes e página de agendamento online | Sim | Sim | Sim | Sim |
| **Automações de WhatsApp** (lembrete com confirmação, oferta de extra) | Não | **Sim** | Sim | Sim |
| Relatórios por profissional | Ver nota 1 | Ver nota 1 | Sim | Sim |
| Várias unidades | Não | Não | Não | Previsto (não disponível na interface hoje) |
| Preço mensal | [A DEFINIR] | [A DEFINIR] | [A DEFINIR] | [A DEFINIR] |
| Forma de pagamento | [A DEFINIR] | [A DEFINIR] | [A DEFINIR] | [A DEFINIR] |

**Nota 1:** na landing, "relatórios por profissional" é listado a partir do Studio, mas o sistema hoje libera o recurso em todos os planos (pendência C2). **Não use esse recurso como barreira de venda** até a decisão.
**Nota 2:** o destaque de "melhor relação custo-benefício" **não é aplicado a nenhum plano**: sem preços, não dá para comprovar.

## 2. Ficha de cada plano

### Solo: "Para quem atende sozinha"
- **Por que existe:** para quem trabalha sozinha e precisa sair do caderno e das mensagens soltas, com o menor compromisso.
- **Quem deve contratar:** manicure, lash designer, sobrancelhista, esteticista, cabeleireira que atende sem equipe.
- **Problema que resolve:** agenda desorganizada, horário marcado em conversa que se perde, falta de visão do mês.
- **O que recebe:** agenda sem conflito, página de agendamento online (link para a bio), ficha de clientes com histórico, importação de clientes por planilha, indicadores do negócio, dicas, pagamentos e sinal registrados, exportação dos seus dados.
- **Limite:** 1 profissional; **sem automações de WhatsApp**.
- **Vantagem sobre o plano superior:** menor compromisso e o mesmo núcleo (agenda, link e clientes).
- **Vantagem de escolher este e não o mais barato:** é o mais barato; a escolha aqui é entre ele e o Pro (ver abaixo).
- **Justificativa do investimento:** [A DEFINIR, depende do preço]. Argumento sem preço: um horário vago ou uma falta por semana já pesa; o plano existe para organizar e dar visibilidade.
- **Principal argumento:** "Sua agenda e seus clientes num lugar só, com o link que as clientes usam para marcar sozinhas."
- **Objeção mais provável:** "Tenho poucas clientes, não preciso." / "Já uso o caderno."
- **Fechamento:** começar o teste de 14 dias e deixar o link no Instagram na primeira semana.

### Pro: "Mais automações para crescer"
- **Por que existe:** para quem já se organizou e quer **parar de confirmar horários uma a uma** e aumentar o ticket sem esforço.
- **Quem deve contratar:** profissional que sofre com faltas, atende com 1 auxiliar (até 2 pessoas) ou quer o lembrete e a oferta de extra automáticos.
- **Problema que resolve:** faltas e horários vagos por falta de confirmação; tempo gasto mandando lembrete à mão.
- **O que recebe:** tudo do Solo + até 2 profissionais + **automações de WhatsApp**: lembrete na véspera (9h), confirmação com um toque, pedido de remarcação, e oferta de serviço extra dentro da conversa depois do "Confirmo". **O envio depende de conectar o número do negócio, feito junto com a equipe da Gê; hoje nenhum canal foi validado em produção** (pendência D1).
- **Limite:** até 2 profissionais; 1 unidade.
- **Vantagem sobre o Solo:** automação de confirmação e capacidade para 2 pessoas.
- **Vantagem sobre o Studio:** menor compromisso quando a equipe ainda é pequena.
- **Por que não o mais barato:** se a dor principal é falta e confirmação, o Solo não resolve (não tem automação).
- **Justificativa:** [A DEFINIR]. Argumento: o lembrete com confirmação trabalha por você todo dia; o cálculo de uma falta (ticket × faltas por mês × 12) mostra o que está em jogo (use números **dela**, nunca inventados).
- **Principal argumento:** "Quem confirma o horário não é você, é o sistema."
- **Objeção mais provável:** "Já confirmo pelo WhatsApp, é rápido." / "Não sei se vai funcionar."
- **Fechamento:** teste de 14 dias com chamada de configuração, incluindo o pedido de conexão do WhatsApp.

### Studio: "Para equipes"
- **Por que existe:** para quem tem **equipe** e precisa de agenda por profissional e visão de cada uma.
- **Quem deve contratar:** salão ou estúdio com 3 a 10 profissionais ativas.
- **Problema que resolve:** várias agendas, conflitos de horário entre profissionais, falta de visão de quem produz o quê.
- **O que recebe:** tudo do Pro + até 10 profissionais + agenda por profissional + relatórios por profissional (ver nota 1).
- **Limite:** até 10 profissionais; 1 unidade.
- **Vantagem sobre o Pro:** capacidade de equipe e visão por profissional.
- **Vantagem sobre o Business:** é o plano completo para um endereço só.
- **Por que não o mais barato:** o Solo e o Pro **bloqueiam a 3ª profissional ativa**: o próprio sistema avisa que é preciso subir de plano.
- **Justificativa:** [A DEFINIR]. Argumento: o custo é dividido por toda a equipe e a agenda única evita conflito.
- **Principal argumento:** "Uma agenda para a equipe toda, sem conflito, com a visão de cada profissional."
- **Objeção mais provável:** "Minha equipe não vai usar." / "Já temos um sistema."
- **Fechamento:** teste de 14 dias (que **já é no Studio**) com a equipe cadastrada e uma semana de uso real.

### Business: "Várias unidades"
- **Por que existe:** para redes ou espaços com mais de um endereço.
- **Quem deve contratar:** quem tem 2 ou mais unidades.
- **Problema que resolve:** gerir unidades e equipes grandes num só lugar.
- **Situação:** o plano lista até 100 profissionais e até 20 unidades, mas **a interface de várias unidades não existe ainda** (Fase 4 do roadmap). **Não vender Business como pronto.** Posicionar como "em desenvolvimento, sob consulta".
- **O que dá para afirmar hoje:** capacidade de até 100 profissionais.
- **Vantagem sobre o Studio:** capacidade e, no futuro, várias unidades.
- **Justificativa e preço:** [A DEFINIR].
- **Principal argumento (quando existir):** uma visão única das unidades.
- **Fechamento:** **não fechar Business agora**; registrar interesse e retomar quando a função estiver pronta.

## 3. Recomendação em 3 perguntas (para a call)
1. **Quantas pessoas atendem?** 1 → Solo ou Pro; 2 → Pro; 3 a 10 → Studio; mais de um endereço → Business (em desenvolvimento).
2. **Qual é a maior dor hoje: falta/confirmação ou só organização?** Falta/confirmação → pelo menos **Pro**. Só organização → Solo.
3. **Quer o lembrete e a oferta de extra automáticos?** Sim → Pro ou acima. Lembre: depende de conectar o WhatsApp junto com a equipe.

Regra de ouro: **recomende o menor plano que resolve a dor dela**, e mostre quando ela vai precisar subir. Essa honestidade é o que sustenta o upgrade depois.

## 4. Como justificar o investimento (sem inventar números)
- Use **a conta dela**: ticket médio × faltas por mês × 12 meses. Os números são dela, nunca da Gê.
- Compare com o **tempo**: quanto tempo por dia ela gasta confirmando e remarcando à mão.
- Mostre **o que já existe de graça no teste**: 14 dias, sem cartão, no plano Studio.
- **Nunca prometa faturamento, aumento de clientes ou queda de faltas em percentual.** Pode dizer que o lembrete com confirmação **ajuda a reduzir** faltas, sem número.

## 5. Os planos no app (conferência)
Em Configurações, a aba Plano lista Solo, Pro, Studio e Business com o limite de profissionais; a conta em teste aparece como Studio. A captura real está em `presentation/screenshots/planos-no-app.png`.
