# GÊ — LAUNCH TRACKER

Fonte oficial de acompanhamento do lançamento. Estratégia de referência: documento "Gê: estratégia de lançamento e primeiras 100 clientes pagantes" (https://claude.ai/artifact/SjEZwbHyNrdUCrG7BDoKwE). Kit de validação: [`materiais-comerciais/`](materiais-comerciais/README.md).

Regra: nenhuma tarefa vira [CONCLUÍDO] sem evidência verificada. Níveis de verificação usados nas evidências: **implementado** (existe código), **testado** (testes automáticos passam), **em produção** (deploy no ar), **validado** (funcionou em ambiente real com cliente ou provedor real).

## Visão geral
- Data de início: 05/11/2026
- Previsão de pré-lançamento: 16/11/2026 a 15/12/2026
- Previsão de beta: 16/12/2026 a 31/01/2027
- Previsão de lançamento oficial: 01/02/2027 (primeira cobrança)
- Foco geográfico: Rio de Janeiro (capital). Suporte: Pedro Chaves (horários a definir)
- Objetivo atual: fechar o mínimo cobrável (WhatsApp real, cobrança, e-mail, importação) e começar as entrevistas de validação
- Progresso geral: **23% (10 de 43 tarefas verificadas como concluídas)**
- Última atualização: 06/11/2026

## Dashboard de progresso
| Área | Concluídas | Pendentes | Em andamento | Bloqueadas | Aguardando minha aprovação |
| --- | --- | --- | --- | --- | --- |
| Produto | 4 | 5 | 2 | 2 | 1 |
| Validação | 3 | 5 | 1 | 0 | 0 |
| Marketing | 3 | 5 | 0 | 0 | 0 |
| Comercial | 0 | 2 | 1 | 0 | 1 |
| Financeiro | 0 | 1 | 0 | 0 | 3 |
| Legal | 0 | 4 | 0 | 0 | 0 |
| **Total** | **10** | **22** | **4** | **2** | **5** |

## Diagnóstico real do produto (auditoria de 05/11/2026)
| Área | Implementado | Testado | Em produção | Validado em ambiente real |
| --- | --- | --- | --- | --- |
| Agenda, agendamento online, CRM leve, pagamentos manuais, indicadores | sim | sim (319 testes de integração e unidade passam; e2e de navegador existem) | sim (deploy bss com sucesso) | não (sem cliente real) |
| Lembrete e conversa por WhatsApp | sim | só com a Meta simulada | código no ar, sem número conectado | não |
| WhatsApp por salão e área `/admin/whatsapp` | sim | sim | no ar, mas **inacessível**: faltam as variáveis na Vercel | não |
| Agendador de mensagens | sim | sim | cron diário da Vercel configurado; o agendador do GitHub **roda e não faz nada** | não |
| Cobrança da assinatura | tabela e bloqueio gradual | parcial | não há integração com provedor | não |
| E-mail, verificação, recuperação de senha | não | não | não | não |
| Importação de clientes por planilha (CSV) | sim | sim (28 testes novos; 347 no total passam; fluxo completo rodado no navegador) | sim (deploy do merge 013a0d5 com sucesso) | não (falta usar uma planilha real de um beta) |
| Termos e privacidade | páginas existem | não se aplica | sim | sem revisão jurídica |

Achados da auditoria (com evidência):
1. **Agendador do GitHub sem efeito.** As execuções agendadas terminam em sucesso, mas o log mostra "CRON_SECRET não configurado neste repositório; nada a fazer" (execução de 05/11/2026 16:52 UTC). Só o cron diário da Vercel e o disparo imediato após cada ação despacham mensagens.
2. **Variáveis ausentes na Vercel (produção).** Lista de nomes lida em 05/11/2026: existem `APP_URL`, `DEFAULT_TIMEZONE`, `CRON_SECRET`, as variáveis do banco Neon e `VITRINE_SEED_TOKEN` (desativada, vazia). Não existem `WHATSAPP_ENCRYPTION_KEY`, `PLATFORM_ADMIN_USER_IDS` nem `WHATSAPP_*` da plataforma. Efeito: o card de conexão de WhatsApp mostra "Em breve" para os clientes e ninguém acessa `/admin`.
3. Nada de cobrança, e-mail nem recuperação de senha no código (busca em `src` e `package.json`). A importação de clientes foi construída em 05/11/2026 (P-07).
4. Não há campo "como conheceu" nem código por canal (busca em `src`).
5. Eventos de funil registrados no produto: `signup.completed`, `onboarding.business_created`, `onboarding.completed`, `booking.online_created`, `booking.client_confirmed`, `whatsapp.upsell_offered`, `whatsapp.upsell_accepted`.

## Tarefas concluídas
| ID | Área | Descrição | Prioridade | Status | Evidência | Data |
| --- | --- | --- | --- | --- | --- | --- |
| P-01 | Produto | Agenda sem conflito, agendamento online, CRM leve, pagamentos manuais e indicadores | Alta | [CONCLUÍDO] | Testado: `npx vitest run` 21 arquivos, 319 testes passam (05/11/2026); em produção: deploy `bss` com sucesso. Não validado com cliente real | 05/11/2026 |
| P-02 | Produto | Motor de mensagens e conversa por WhatsApp (código) | Alta | [CONCLUÍDO] | Testes `automacoes-*`, `whatsapp.test.ts` passam com a Meta simulada. Validação real em P-05 | 05/11/2026 |
| P-03 | Produto | WhatsApp por salão: conexão assistida, token criptografado, área `/admin/whatsapp` | Alta | [CONCLUÍDO] | PRs 66, 67 e 70 mesclados; deploy com sucesso; `whatsapp-por-salao.test.ts` passa. Faltam variáveis de produção (P-04) | 05/11/2026 |
| P-07 | Produto | Importação de clientes por planilha (CSV) | Alta | [CONCLUÍDO] | PR 73 mesclado em 06/11/2026; deploy `bss` e `studio-manoella-lopes` com sucesso no commit 013a0d5 (o build aplica as migrações e compila a rota). Testes: `tests/unit/client-import.test.ts` (19) e `tests/integration/importar-clientes.test.ts` (9); fluxo rodado no navegador em desenvolvimento. Não pude abrir o app em produção daqui (rede bloqueada); falta validar com uma planilha real | 06/11/2026 |
| M-07 | Marketing | [SUGESTÃO] Peças visuais dos primeiros conteúdos: foto de perfil, carrossel do dia 2, post do dia 12, Stories do dia 11 e capas de Reels dos dias 1 e 4 | Média | [CONCLUÍDO] | 16 imagens PNG em `materiais-comerciais/visual/png/` geradas e conferidas visualmente (tamanhos 1080×1080, 1080×1350 e 1080×1920; script `gerar.mjs` checa estouro de borda); fontes e HTML editáveis na mesma pasta. Nada publicado | 06/11/2026 |
| V-01 | Validação | Roteiro de entrevistas | Alta | [CONCLUÍDO] | `materiais-comerciais/ROTEIRO-ENTREVISTAS.md` (55 linhas) | 05/11/2026 |
| V-02 | Validação | Questionário de dores (8 perguntas) | Alta | [CONCLUÍDO] | `materiais-comerciais/QUESTIONARIO-DORES.md` (8 perguntas, tabela conferida) | 05/11/2026 |
| V-03 | Validação | Planilha de prospecção e placar semanal | Média | [CONCLUÍDO] | `materiais-comerciais/PLANILHA-PROSPECCAO.csv` (19 colunas) e `PLACAR-SEMANAL.csv` (10 colunas) lidos por script | 05/11/2026 |
| M-01 | Marketing | Mensagens de abordagem e respostas a objeções | Alta | [CONCLUÍDO] | `materiais-comerciais/MENSAGENS-ABORDAGEM.md` (envio real depende de aprovação) | 05/11/2026 |
| M-02 | Marketing | Calendário editorial de 30 dias | Média | [CONCLUÍDO] | `materiais-comerciais/CALENDARIO-CONTEUDO-30-DIAS.md` (30 linhas conferidas), exportado da seção 9 do documento de estratégia, que não mudou desde a escrita (revisão 20) | 05/11/2026 |

## Tarefas em andamento
| ID | Área | Descrição | Prioridade | Status | Dependências | Evidência | Próxima ação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-11 | Produto | Checklist de ativação e alertas de baixo uso | Média | [EM ANDAMENTO] | P-12 | Dicas e eventos de onboarding existem; não há alerta de baixo uso nem lista de contas em risco | Definir o evento de ativação no banco e a lista diária de contas em risco |
| P-14 | Produto | Exportação completa de dados (LGPD) | Média | [EM ANDAMENTO] | L-03 | Exportação CSV de clientes existe (`/app/clientes/exportar`); solicitação de exclusão anotada; falta exportar agenda e financeiro | Incluir agenda e pagamentos na exportação |
| C-04 | Comercial | Definir quem atende o suporte e em quais horários | Média | [EM ANDAMENTO] | nenhuma | Resposta de 05/11/2026: o suporte será **Pedro Chaves**. Horários ainda não informados | Você informar os dias e horários de atendimento |
| V-06 | Validação | Conta de demonstração em produção | Alta | [EM ANDAMENTO] | P-04 | Script `seed-vitrine` e módulo `vitrine` existem; a variável de criação está desativada, e a existência da conta em produção não foi verificada | Você confirmar o login da conta de demonstração em produção, ou eu preparar a recriação com aprovação |

## Tarefas pendentes
| ID | Área | Descrição | Prioridade | Status | Dependências | Evidência | Próxima ação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-08 | Produto | E-mail transacional, verificação de e-mail e recuperação de senha | Alta | [PENDENTE] | F-02 | Sem biblioteca nem rota de e-mail | Depois da escolha do provedor |
| P-09 | Produto | Cobrança recorrente da assinatura (Pix e cartão) | Alta | [PENDENTE] | F-01 | Sem integração com provedor | Depois da escolha do provedor |
| P-10 | Produto | Campo "como conheceu" e código por canal no cadastro | Média | [PENDENTE] | nenhuma | Busca em `src` sem resultado | Adicionar campo e evento de funil |
| P-12 | Produto | Consultas do painel do fundador (KPIs) | Média | [PENDENTE] | P-10 | 7 eventos de funil registrados | Criar consultas e planilha de acompanhamento |
| P-13 | Produto | Backup do banco e monitoramento de erros | Alta | [PENDENTE] | F-03 | Banco é Neon via Vercel; plano e backup não verificados | Você informar o plano do Neon; eu propor monitoramento |
| V-04 | Validação | Lista de 100 lash e nail designers do Rio de Janeiro | Alta | [PENDENTE] | nenhuma (cidade definida em 05/11/2026) | Planilha modelo e `materiais-comerciais/GUIA-LISTA-RIO.md` prontos; a lista em si não existe | Você (ou quem indicar) montar os 100 perfis seguindo o guia; eu não acesso o Instagram daqui |
| V-05 | Validação | 20 entrevistas (mínimo 12) | Alta | [PENDENTE] | V-04 e sua aprovação para enviar (V-01 e M-01 prontos) | Kit pronto | Enviar 20 mensagens por dia após aprovação |
| V-07 | Validação | Landing com botão "Quero testar" e lista de espera de 3 campos | Alta | [PENDENTE] | P-10 | A landing tem "Começar grátis" (cadastro), sem lista de espera | Criar formulário de lista de espera |
| V-08 | Validação | Teste de preço (Van Westendorp e ofertas de R$ 49, R$ 69, R$ 89) | Média | [PENDENTE] | C-01, V-05 | Perguntas no roteiro | Executar nas demonstrações |
| V-09 | Validação | Recrutar 15 profissionais para o beta | Alta | [PENDENTE] | V-05, P-05 | Nenhuma | Convidar as entrevistadas que toparem |
| M-03 | Marketing | Roteiros e legendas dos 12 primeiros conteúdos | Média | [PENDENTE] | nenhuma | Calendário pronto | Redigir roteiros dos 12 primeiros dias |
| M-04 | Marketing | Publicar conteúdos no Instagram e TikTok | Média | [PENDENTE] | M-03 e sua aprovação | Nenhuma | Aguardar roteiros |
| M-05 | Marketing | Perfil do Instagram e TikTok (bio, link, destaques) | Média | [PENDENTE] | C-02 | Nenhuma | Você informar os perfis |
| M-06 | Marketing | Lista de 10 escolas e educadoras de cílios e unhas para parceria | Média | [PENDENTE] | V-04 | Nenhuma | Montar a lista |
| M-08 | Marketing | [SUGESTÃO] Peças visuais dos demais dias, capas de destaques do Instagram e vídeos de demonstração (gravação de tela) | Média | [PENDENTE] | M-03 | Só os dias 1, 2, 4, 11 e 12 têm arte | Definir a ordem com você; vídeos de tela exigem gravar o app (não consigo daqui) |
| C-02 | Comercial | Página de preços e oferta de fundadora | Alta | [PENDENTE] | C-01 | Planos no código ainda mostram "preço em definição" | Atualizar a página depois da decisão |
| C-03 | Comercial | Roteiro da demonstração de 15 min e da chamada de configuração de 20 min | Média | [PENDENTE] [SUGESTÃO] | nenhuma | Citados na estratégia, sem roteiro escrito | Redigir os dois roteiros |
| F-04 | Financeiro | Planilha de acompanhamento (MRR, CAC, caixa) | Média | [PENDENTE] | P-12 | Nenhuma | Criar modelo a partir da seção 12 |
| L-01 | Legal | Consultar o INPI sobre o nome "Gê" | Alta | [PENDENTE] | nenhuma | Nenhuma | Você ou um advogado consultarem |
| L-02 | Legal | Abrir a empresa e definir o enquadramento fiscal com contador | Alta | [PENDENTE] | nenhuma | Nenhuma | Você falar com um contador; necessário para verificar a conta na Meta e emitir nota |
| L-03 | Legal | Revisão jurídica de Termos, Privacidade e termo de tratamento de dados (operadora) | Média | [PENDENTE] | nenhuma | Páginas existem (27 e 35 linhas), sem revisão | Contratar revisão jurídica (precisa de sua aprovação) |
| L-04 | Legal | Designar encarregado de dados (LGPD) | Média | [PENDENTE] | nenhuma | Nenhuma | Você definir quem |

## Tarefas bloqueadas
| ID | Área | Descrição | Prioridade | Status | Motivo | O que você precisa fazer |
| --- | --- | --- | --- | --- | --- | --- |
| P-05 | Produto | Validar o WhatsApp com a Meta real: um número de teste, os 3 modelos aprovados, um envio e uma resposta | Crítica | [BLOQUEADO] | Exige conta Meta Business, app, número e token; depende de P-04 | Criar ou me dar acesso ao app da Meta com um número de teste e gerar o token; entregar os dados pelo `/admin/whatsapp` (nunca no chat) |
| P-06 | Produto | Agendador de mensagens a cada 5 minutos | Alta | [BLOQUEADO] | O secret `CRON_SECRET` não existe no GitHub (log de 05/11/2026) | No GitHub, em Settings, Secrets and variables, Actions, criar `CRON_SECRET` com o mesmo valor da variável da Vercel |

## Aguardando sua aprovação
| ID | Área | Descrição | Prioridade | Status | Por que precisa de você | Próxima ação |
| --- | --- | --- | --- | --- | --- | --- |
| P-04 | Produto | Configurar em produção `WHATSAPP_ENCRYPTION_KEY` e `PLATFORM_ADMIN_USER_IDS` | Crítica | [AGUARDANDO MINHA APROVAÇÃO] | Altera configuração de produção. O código de conta é seu e aparece em Configurações, Conta e privacidade | Você aprovar que eu cadastre a chave e informar o código de conta, ou cadastrar você mesma |
| C-01 | Comercial | Definir o preço inicial do Pro a testar (R$ 49, R$ 69 ou R$ 89) | Alta | [AGUARDANDO MINHA APROVAÇÃO] | Decisão comercial sua | Responder |
| F-01 | Financeiro | Escolher o provedor de cobrança recorrente (Asaas, Iugu, Pagar.me ou Stripe) | Alta | [AGUARDANDO MINHA APROVAÇÃO] | Contratar ferramenta | Eu comparo tarifas oficiais quando houver acesso às páginas; você escolhe |
| F-02 | Financeiro | Escolher o provedor de e-mail transacional | Alta | [AGUARDANDO MINHA APROVAÇÃO] | Contratar ferramenta | Você escolher (Resend ou Postmark são os citados) |
| F-03 | Financeiro | Aprovar o orçamento do lançamento (enxuto: R$ 7.750 em 90 dias) | Alta | [AGUARDANDO MINHA APROVAÇÃO] | Realizar gastos | Você aprovar ou ajustar |

## Próximas 3 ações prioritárias
1. **P-04 e depois P-05: colocar o WhatsApp para funcionar de verdade.** Sem isso, a promessa principal da Gê não existe. Você aprova P-04; depois eu preparo o passo a passo da Meta para P-05.
2. **V-04 e V-05: começar as entrevistas no Rio.** Monte os 100 perfis com o `GUIA-LISTA-RIO.md` e aprove o envio das primeiras 20 mensagens.
3. **F-01 e F-02: escolher cobrança e e-mail.** São os últimos bloqueadores técnicos antes de cobrar.

Tarefa que eu executo sozinha na próxima sessão: **P-10, campo "como conheceu" e código por canal** (destrava V-07, a lista de espera, e P-12, os KPIs).

## Histórico de execução
| Data | Tarefa | Resultado | Arquivos alterados | Pendências encontradas |
| --- | --- | --- | --- | --- |
| 05/11/2026 | Auditoria inicial do repositório, da Vercel e do GitHub | Diagnóstico acima; 41 tarefas mapeadas; progresso 20% | `LAUNCH_TRACKER.md` | Agendador do GitHub sem efeito (P-06); variáveis do WhatsApp por salão e do `/admin` ausentes na Vercel (P-04) |
| 05/11/2026 | V-01, V-02, V-03, M-01: kit de validação e abordagem | Concluídas; arquivos criados e conferidos (colunas do CSV, linhas dos documentos) | `materiais-comerciais/README.md`, `ROTEIRO-ENTREVISTAS.md`, `MENSAGENS-ABORDAGEM.md`, `QUESTIONARIO-DORES.md`, `PLANILHA-PROSPECCAO.csv`, `PLACAR-SEMANAL.csv` | Envio real de mensagens e publicação do questionário dependem de aprovação |
| 05/11/2026 | P-07: importação de clientes por planilha | Implementada e testada; aguardando merge para virar [CONCLUÍDO]. Verificação do estado: P-04 e P-06 continuam abertos (sem as variáveis na Vercel; log do agendador ainda diz "CRON_SECRET não configurado" às 22:26 UTC) | `src/domain/client-import.ts`, `src/server/modules/client-import.ts`, `src/app/app/clientes/importar-actions.ts`, `src/app/app/clientes/import-clients-button.tsx`, `src/app/app/clientes/importar/modelo/route.ts`, `src/app/app/clientes/page.tsx`, 2 arquivos de teste | O papel do aplicativo não escreve em `product_events`: o evento `clients.imported` é gravado pelo sistema na ação |
| 05/11/2026 | Respostas do dono: cidade Rio de Janeiro; suporte Pedro Chaves | V-04 destravada (guia pronto); C-04 em andamento (faltam horários) | `materiais-comerciais/GUIA-LISTA-RIO.md`, `materiais-comerciais/README.md`, `LAUNCH_TRACKER.md` | A lista real exige acesso ao Instagram, que não tenho aqui |
| 06/11/2026 | Verificação do merge dos PRs 73 e 74 | PR 73 (importação) na `main` e com deploy ok: P-07 concluída. O PR 74 foi mesclado na branch do PR 73 depois do merge deste, então **não chegou na `main`**; as mudanças (guia do Rio, Pedro Chaves, C-04) voltam neste PR | `LAUNCH_TRACKER.md`, `materiais-comerciais/GUIA-LISTA-RIO.md`, `materiais-comerciais/README.md` | Lição: mesclar PRs empilhados na ordem e conferir se o segundo chegou na `main` |
| 06/11/2026 | Reunir os materiais comerciais em uma pasta | Pasta `materiais-comerciais/` criada: os 7 arquivos do kit movidos de `docs/lancamento/` (histórico preservado com `git mv`) e 2 novos exportados da estratégia (calendário de 30 dias e mensagens por canal e funil). Referências do tracker atualizadas | `materiais-comerciais/*`, `LAUNCH_TRACKER.md` | O documento de estratégia continua só no Claude (link no tracker); os preços e ofertas dos materiais dependem de C-01 |
| 06/11/2026 | Parte visual (pedido do dono): M-07 | 16 peças geradas e conferidas; progresso 23% (10 de 43; duas tarefas novas marcadas [SUGESTÃO]) | `materiais-comerciais/visual/*`, `materiais-comerciais/README.md`, `LAUNCH_TRACKER.md` | Dados de exemplo nas imagens (nomes, R$ 150); "15 vagas no beta" só vale se o beta existir; publicar depende de aprovação (M-04) |
