# Playbook de upsell da Gê

**Princípio:** upgrade se faz por **necessidade, crescimento e uso**, nunca só por preço. Recomende o plano que resolve a dor de hoje e mostre **antes** quando ela vai precisar subir. Quem foi bem orientada sobe sem resistência.

**O que é oficial hoje:** a escada **Solo → Pro → Studio → Business** (`src/domain/plans.ts`). **Preços: [A DEFINIR]** (C-01). **Não existem** plano anual, complementos pagos nem serviços pagos: estão na seção 6 como **sugestões futuras**.

**Como o sistema ajuda (fatos verificados):**
- O limite de profissionais é **aplicado**: ao tentar ativar mais profissionais que o plano permite, a Gê avisa que é preciso subir de plano.
- As **automações de WhatsApp** só funcionam nos planos Pro, Studio e Business (e durante o teste).
- O painel mostra sinais úteis: confirmações pendentes, faltas, ocupação, "como está cada profissional", e dicas como "clientes que já faltaram vêm nos próximos dias".

**Atenção (honestidade):** o WhatsApp só envia depois de conectado junto com a equipe (pendência D1). Não prometa lembrete funcionando antes disso. **Business**: a interface de várias unidades **ainda não existe**; não vender como pronto.

**Variáveis nos scripts:** `{nome}` = nome da cliente; `[...]` = preencha com o que ela disse.

---
## 1. Solo → Pro

**A. Perfil de quem contratou o Solo:** atende sozinha, quer sair do caderno, valoriza simplicidade. Já usa agenda e link.

**B. Sinais de que está pronta para o Pro:**
- Reclama de **confirmar horários à mão** ou de **faltas**; ou o painel mostra confirmações pendentes e faltas recorrentes.
- Tem muitos agendamentos pelo link e pouca confirmação.
- Quer **contratar uma ajudante** (2ª profissional): o sistema bloqueia no Solo.
- Pergunta sobre lembrete automático por WhatsApp.

**C. Necessidade que justifica:** parar de gastar tempo confirmando e reduzir faltas; ou ter 2 profissionais.

**D. Benefícios do Pro:** lembrete na véspera (9h) com confirmação por toque, pedido de remarcação, oferta de serviço extra dentro da conversa (**depende de conectar o WhatsApp com a equipe**) e até 2 profissionais.

**E. Diferença financeira:** [A DEFINIR]. Apresente só depois de mostrar o custo de uma falta com os números dela.

**F. Argumento de venda:** "Quem confirma o horário não é mais você, é o sistema. Você ganha o tempo de volta e perde menos horário."

**G. Script de abordagem (conversa):** "{nome}, olhei como você está usando a Gê e vi que [X confirmações ficaram pendentes / você teve faltas este mês]. Quanto tempo por dia você gasta confirmando à mão? Tem um recurso que faz isso sozinho. Posso te mostrar em 5 minutos?"

**H. Script de WhatsApp:** "Oi, {nome}! Vi que você usa bastante o link de agendamento 💛 Quer que o lembrete e a confirmação saiam sozinhos, pelo WhatsApp do seu negócio? É o plano Pro. Te mostro em 5 minutos?"

**I. Script para call:** (1) Pergunte quantas faltas e confirmações pendentes teve no último mês. (2) Faça a conta com os números dela (ticket × faltas × 12). (3) Mostre o fluxo: lembrete → "Confirmo" → agenda muda. (4) Diga com clareza: "a conexão do WhatsApp é feita junto com a nossa equipe". (5) Apresente o Pro e o investimento [A DEFINIR]. (6) Pergunte: "Quer ativar agora?"

**J. Respostas às objeções:**
- "Já confirmo à mão, é rápido." → "Quanto tempo por dia? E quando você esquece ou a cliente não responde?"
- "Está caro." → use o manual de objeções (nº 1); comece pela conta das faltas.
- "E se o WhatsApp não funcionar para mim?" → "A conexão é feita junto com a equipe numa chamada; se não fizer sentido, você continua no Solo."

**K. CTA de fechamento:** "Vamos ativar o Pro e agendar a chamada para conectar o seu WhatsApp?"

---
## 2. Pro → Studio

**A. Perfil:** já usa as automações; agora tem (ou vai ter) mais gente na agenda.

**B. Sinais:**
- Quer ativar a **3ª profissional** e o sistema bloqueia (limite de 2).
- Pergunta "como está cada profissional" / quem produz mais; conflitos de horário entre pessoas.
- Aumento do volume de agendamentos e da equipe.

**C. Necessidade:** agenda única da equipe, sem conflito, com visão por profissional.

**D. Benefícios do Studio:** até 10 profissionais, agenda por profissional e relatórios por profissional (ver pendência C2: o recurso hoje está liberado em todos os planos, então o argumento forte é **capacidade da equipe**).

**E. Diferença financeira:** [A DEFINIR]. Argumento: o custo é dividido por toda a equipe.

**F. Argumento:** "Uma agenda para a equipe toda, sem conflito, e você vê como cada profissional está indo."

**G. Abordagem:** "{nome}, vi que você está contratando [a 3ª profissional]. Para ela entrar na agenda, precisamos do plano Studio. Posso te explicar o que muda?"

**H. WhatsApp:** "Oi, {nome}! Parabéns pelo crescimento da equipe 🎉 Para colocar a [nome] na agenda é preciso o plano Studio (até 10 profissionais). Te explico rapidinho?"

**I. Call:** (1) Pergunte quantas pessoas atendem e como dividem a agenda hoje. (2) Mostre a agenda por profissional e o painel de cada uma. (3) Mostre o limite: "no Pro a 3ª não entra". (4) Apresente o Studio e o investimento [A DEFINIR]. (5) Combine quem cadastra a equipe e quando.

**J. Objeções:** "Minha equipe não vai usar." → "Começamos por quem usa mais e a agenda mostra quem não está usando." / "Sou eu quem cuida de tudo." → "Então só você precisa dominar; as outras só veem a agenda delas."

**K. CTA:** "Vamos migrar para o Studio e cadastrar a equipe hoje?"

---
## 3. Studio → Business (várias unidades)

**Situação:** o plano Business existe no código, mas **a interface de várias unidades ainda não existe**. Portanto **não há upgrade a fechar hoje**.

**A. Perfil:** estúdio com 2 ou mais endereços.
**B. Sinais:** abriu uma segunda unidade; precisa ver as unidades juntas.
**C. Necessidade:** gestão de unidades.
**D. Benefícios:** capacidade de até 100 profissionais **hoje**; várias unidades **quando estiver pronto**.
**E. Diferença financeira:** [A DEFINIR].
**F. Argumento (quando existir):** uma visão única das unidades.
**G/H/I. Scripts (honestos):** "{nome}, a gestão de várias unidades ainda está em desenvolvimento. Posso anotar o seu interesse e te avisar quando estiver pronta? Enquanto isso, o Studio atende uma unidade com até 10 profissionais."
**J. Objeção:** "Preciso agora." → "Hoje cada unidade teria uma conta separada" (**confirmar essa orientação antes de dizer**; pendência).
**K. CTA:** "Anoto o seu contato para te avisar. Combinado?"

---
## 4. Business → plano superior
**Não existe plano acima do Business.** Não crie upgrade fictício. Para contas grandes, registre necessidades (integrações, relatórios, suporte dedicado) como **insumo de produto** e trate como sugestão futura (seção 6).

---
## 5. Quando o upsell **não** é a resposta (cuidado)
- A cliente **usa pouco** a ferramenta: o problema é adoção, não plano. Ofereça ajuda de uso (chamada de configuração) antes de falar de upgrade.
- Falta de caixa: respeite e combine uma data de revisão.
- Descontentamento: resolva o problema antes.
- **Regra:** nunca empurre um plano maior para "bater número". Se o menor resolve, mantenha.

## 6. Sugestões futuras (NÃO são ofertas oficiais)
| Ideia | Situação | Condição para virar oferta |
| --- | --- | --- |
| **Plano anual** | O banco aceita ciclo anual, mas não há oferta definida. | Decidir se haverá, com que condição e depois da cobrança integrada (P-09). |
| **Configuração assistida / importação feita pela equipe** | Hoje acontece em chamada de configuração, sem preço. | Decidir se será cobrada. |
| **Complementos** (ex.: mais mensagens, domínio próprio da página) | Não existem. | Decidir após validar demanda. |
| **Pacotes e fidelidade** | Previstos no roadmap (Fase 4), ainda não existem. | Depois de construídos. |
| **Suporte prioritário** | Não existe. | Depois de definir o suporte (C-04). |

## 7. Painel de sinais (para o vendedor acompanhar)
| Sinal | Onde ver | Plano alvo |
| --- | --- | --- |
| Muitas confirmações pendentes / faltas | Início e Relatórios | Pro |
| Quer ativar mais profissionais e o sistema bloqueia | Equipe e horários | Pro ou Studio |
| Pergunta por "como está cada profissional" | Relatórios | Studio |
| Quer várias unidades | Conversa | Business (em desenvolvimento) |
| Baixo uso (sem horários novos há semanas) | Painel do fundador | Não é upsell: é suporte |

## 8. Cadência de relacionamento (sem pressão)
- **Dia 3 do teste:** "Conseguiu colocar o link na bio?" (ajuda de uso).
- **Dia 10 do teste:** conversa curta de resultados e recomendação do plano.
- **Dia 14:** decisão e próximo passo.
- **Mensal depois de contratar:** olhar sinais (seção 7). Um contato com valor, não cobrança.
