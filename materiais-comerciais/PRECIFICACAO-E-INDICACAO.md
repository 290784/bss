# Revisão do projeto, precificação e plano de indicação das embaixadoras

Data: 26/11/2026. **Nada aqui é preço ou oferta oficial.** São cenários e propostas para o dono decidir (C-01, C-02, F-01). Contas em `PLANILHA-PRECIFICACAO.xlsx` (fórmulas conferidas à mão em 3 casos).

## 1. Revisão do projeto (onde estamos)
- **Progresso:** 22 de 48 tarefas concluídas (46%), conforme o `LAUNCH_TRACKER.md`. O produto já tem agenda, link de agendamento, clientes, importação, indicadores, dicas, exportação, painel do fundador e lista de espera com aviso no Telegram.
- **WhatsApp (P-05):** Meta conectada com o número de teste; falta ligar o webhook na Meta, aprovar os 3 modelos e fazer o primeiro envio e a resposta "Confirmo". **Agendador (P-06):** falta o `CRON_SECRET` na Vercel e no GitHub; sem isso nenhum lembrete sai.
- **Lacunas que afetam venda:** (1) não há como **trocar a senha dentro do app**; (2) e-mail transacional não existe (F-02), então "esqueci a senha" não funciona; (3) **não há cobrança** (P-09): o primeiro recebimento tem de ser Pix manual; (4) relatórios por profissional e limite de unidades **não são aplicados** pelo plano; (5) gestão de várias unidades não existe (Business sem preço).
- **Riscos:** política de privacidade sem revisão (L-03); empresa não aberta (L-02), que a Meta exige para verificação; Vercel no plano Hobby (termos para uso comercial a confirmar antes da primeira cobrança, prevista para 01/02/2027); nenhuma evidência de demanda ainda (V-04/V-05 não rodaram), então preço é hipótese.

## 2. Custos (verificados em 26/11/2026 nas páginas oficiais)

| Item | Valor | Situação |
| --- | --- | --- |
| Vercel Pro | US$ 20/mês por pessoa que faz deploy | verificado. Hobby é grátis; termos de uso comercial **não li** |
| Neon | Free: US$ 0, 1 GB por projeto, sem cartão. Launch: por uso (US$ 0,106 por CU-hora; US$ 0,35 por GB-mês); página cita gasto típico de US$ 15/mês | verificado |
| Asaas | Sem mensalidade. Cartão à vista R$ 0,49 + 2,99%; Pix R$ 2,15 ou R$ 1,08 por cobrança (usei a maior) | verificado; confirmar o contrato |
| Resend | Gratuito: 3.000 e-mails/mês e 100/dia | verificado |
| Meta (WhatsApp) | Cobra por mensagem de modelo entregue; respostas na janela de 24h costumam ser gratuitas | **tarifa em reais NÃO lida** (CSV); usei R$ 0,10 como **hipótese** |
| Câmbio, imposto, lembretes por conta | R$ 5,50, 6%, 60 (Pro) e 200 (Studio) | **hipóteses** |

## 3. Precificação
**Cenários testados (preço por mês):**

| Plano | A conservador | B intermediário | C ambicioso |
| --- | --- | --- | --- |
| Solo | R$ 29 | R$ 39 | R$ 49 |
| Pro | R$ 49 | R$ 69 | R$ 89 |
| Studio | R$ 99 | R$ 139 | R$ 179 |
| Business | sob consulta | sob consulta | sob consulta |

**Margem de contribuição por conta (depois de taxa de pagamento, imposto e WhatsApp):**

| Plano | A | B | C |
| --- | --- | --- | --- |
| Solo | R$ 25,51 (88%) | R$ 34,76 (89%) | R$ 44,01 (90%) |
| Pro | R$ 38,01 (78%) | R$ 56,51 (82%) | R$ 75,01 (84%) |
| Studio | R$ 70,26 (71%) | R$ 107,26 (77%) | R$ 144,26 (81%) |

**Ponto de equilíbrio** (custos fixos de R$ 1.722,50 por mês, com o mix de 40% Solo, 45% Pro e 15% Studio): **46 contas no A, 32 no B, 24 no C**. Com 100 contas pagantes, o lucro mensal antes de marketing seria cerca de R$ 2.062, R$ 3.820 e R$ 5.577.

**O que isso mostra:** o custo variável é pequeno (taxa de pagamento, imposto e WhatsApp), então **quase todo o preço vira margem**. Subir R$ 20 no Pro aumenta o lucro por conta mais do que qualquer corte de custo. O ganho de lucro vem de **preço e retenção**, e não de cortar infraestrutura.

**Argumento de valor (use como hipótese, nunca como promessa):** se um atendimento vale R$ 100 e a Gê ajudar a evitar uma falta por mês, o plano Pro de R$ 69 a R$ 89 "se paga" com uma falta evitada. O teste V-08 dirá o preço que as profissionais aceitam.

**Minha recomendação de trabalho (você decide):**
1. Rodar o teste V-08 com o Pro em R$ 49, 69 e 89, como já planejado.
2. Enquanto isso, usar como hipótese de **tabela o cenário C** (Solo R$ 49, Pro R$ 89, Studio R$ 179) e como **preço de fundadora o cenário B**, travado por 12 meses para as primeiras contas. Isso protege a margem de tabela e premia quem entra cedo. É uma proposta de oferta e **ainda não existe**.
3. **Plano anual:** 10 meses pelo preço de 12, pago à vista (sugestão; não existe).
4. **Lembretes (Meta) são o único custo que cresce com o uso.** Se a tarifa real for maior que a hipótese, o plano Studio é o mais sensível. Confirmar a tabela em reais antes de fechar o preço dele.
5. Não cobrar o Business até a gestão de unidades existir.

## 4. Plano de indicação das embaixadoras (proposta)
**Ideia:** cada embaixadora tem um **código** e um link de cadastro com esse código (o app já grava a origem do cadastro, `?c=codigo`, e o painel do fundador mostra cadastros por canal). Ela é paga quando a indicada **paga**, e não quando só se cadastra.

**Regras propostas**
- **Comissão:** 20% de cada mensalidade paga pela indicada, por **6 meses** a partir do 1º pagamento.
- **Para a indicada:** 14 dias grátis (já existe) e **20% de desconto no 1º mês** pago (proposta, ainda não existe).
- **Bônus de nível:** com **5 indicadas pagantes ativas**, o plano da própria embaixadora fica grátis enquanto mantiver as 5. (Custa menos do que aumentar a comissão: ela deixa de pagar uma mensalidade com margem de ordem de R$ 56 e recebe 5 × R$ 13,80 = R$ 69 por mês em comissão, no cenário B.)
- **Pagamento:** por Pix, até o dia 10 do mês seguinte, com mínimo de R$ 30 acumulados.
- **Controles:** primeiro código do cadastro vale (sem troca depois); sem indicar a si mesma nem pessoa da mesma conta; comissão some se a indicada pedir estorno; teto de 20 indicadas por embaixadora no início; a Gê pode encerrar o programa com aviso.
- **Conduta da embaixadora:** divulgar sempre como embaixadora (publicidade identificada), não prometer resultado, **não mandar mensagens a quem não aceitou receber**, usar só o material oficial.

**Quanto custa (cenário B, Pro a R$ 69, na planilha):** comissão de R$ 82,80 por indicada ao longo de 6 meses + desconto de R$ 13,80 = **custo de aquisição de R$ 96,60**. A margem do Pro é R$ 56,51 por mês, então a indicada **se paga em 2 meses**, e em 12 meses ela deixa R$ 581,50 para a Gê depois de pagar a embaixadora. No cenário C (Pro R$ 89) a margem é maior, e no A (Pro R$ 49) o retorno cai. Sempre confira a aba Indicação.

**Como operar enquanto não houver cobrança integrada (P-09):** planilha simples por embaixadora (código, indicadas, data do 1º pagamento, valor, comissão, pago em). O painel do fundador já mostra os cadastros por código; os pagamentos entram à mão até a P-09.

**O que precisa de decisão ou ajuda de fora**
- **Contador (L-02):** pagar comissão a pessoa física ou a MEI tem implicação fiscal (nota, recibo, retenção). Não decidi nada disso.
- **Termos da indicação:** um texto curto de aceite (regras, prazo, conduta, encerramento). Posso redigir um **rascunho para revisão jurídica**, mas não é parecer.
- **Esses valores (20%, 6 meses, 20% de desconto, bônus em 5)** são propostas para testar com poucas embaixadoras, não números provados.

## 5. Decisões que dependem de você
1. **C-01:** qual preço testar (e a política: tabela C, fundadora B, ou outra).
2. **F-01:** como receber no começo (Pix manual) e quando integrar o provedor (Asaas e outros).
3. **Indicação:** aprovar, ajustar ou recusar comissão, prazo, desconto e bônus.
4. **Vercel Pro:** a partir de quando pagar (US$ 20/mês), antes da primeira cobrança.
5. **Meta:** confirmar a tarifa em reais por lembrete (eu posso ler a tabela se você liberar o endereço do arquivo da Meta ou me enviar o CSV).
