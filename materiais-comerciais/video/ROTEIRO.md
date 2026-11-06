# Roteiro do vídeo de apresentação da Gê (cerca de 2 minutos e 40 segundos)

**Como o vídeo é feito:** não é uma réplica desenhada. O `gravar.mjs` conduz o **próprio app** (o mesmo código, com as mesmas fontes, animações e interações) e grava a tela. Por isso o que aparece é exatamente o que a profissional vê. Por cima ficam só um cursor, o efeito de clique e uma legenda curta. Os dados são os da conta de demonstração (clientes fictícias).

Cada cena tem uma **legenda** (já aparece no vídeo) e uma **fala** (para narrar, se quiser; o vídeo sai sem áudio).

## Cena 1: página de vendas (cerca de 35 s)
| Tempo | Na tela | Legenda | Fala sugerida |
| --- | --- | --- | --- |
| 0:00 | Topo da página: título "Agenda cheia, cabeça leve" e a agenda do dia | A Gê organiza a agenda de quem trabalha com beleza | "Esta é a Gê: a agenda, as clientes e os lembretes de quem trabalha com beleza, num lugar só." |
| 0:05 | Rola até a demonstração de agendamento (anima sozinha) | A cliente marca sozinha, só em horários livres | "A cliente escolhe o serviço e marca sozinha, e só vê horários realmente livres." |
| 0:16 | Rola até os recursos (o carrossel passa sozinho) | Lembrete com confirmação pelo WhatsApp do próprio salão | "A Gê lembra na véspera, e a cliente confirma com um toque, pelo WhatsApp do seu salão." |
| 0:28 | Planos | Teste grátis por 14 dias, sem cartão | "E você testa por 14 dias, sem cartão." |

## Cena 2: painel do salão (cerca de 90 s)
| Tempo | Na tela | Legenda | Fala sugerida |
| --- | --- | --- | --- |
| 0:00 | Login digitado | O painel do salão: entra e já vê o dia | "Você entra e já vê o seu dia." |
| 0:08 | Início, com a saudação do dia que se escreve e se apaga | Todo dia uma saudação nova, e o resumo do dia logo abaixo | "Todo dia a Gê recebe você com uma frase diferente, e o resumo do dia vem logo abaixo." |
| 0:22 | Rola o início | Quanto entrou, quanto está previsto e quem sumiu | "Quanto entrou, quanto está previsto e quais clientes sumiram." |
| 0:30 | Agenda | Agenda por dia, semana e mês, sem conflito de horário | "A agenda mostra cada profissional, e não deixa dois atendimentos no mesmo horário." |
| 0:38 | Abre um atendimento | Um toque abre o atendimento: serviços, valor e pagamento | "Um toque abre o atendimento, com serviços, valor e pagamento." |
| 0:46 | Clientes | Clientes: histórico, frequência e quem não volta há tempo | "Cada cliente tem histórico e frequência, e você vê quem não volta há tempo." |
| 0:52 | Importar planilha, prévia | Trouxe sua lista de outro sistema? Importe a planilha e confira antes. Mostra quem entra, quem já existe e o que tem erro, antes de gravar | "Veio de outro sistema? Importe sua planilha: a Gê mostra quem entra, quem já existe e o que tem erro, antes de gravar qualquer coisa." |
| 1:10 | Configurações, WhatsApp | WhatsApp pelo número do próprio salão: você pede, a equipe da Gê configura com você. O lembrete sai na véspera e a cliente confirma com um toque | "O WhatsApp sai pelo número do seu salão. Você pede, e a nossa equipe configura com você, numa chamada rápida." |

## Cena 3: no celular da cliente (cerca de 25 s)
| Tempo | Na tela | Legenda | Fala sugerida |
| --- | --- | --- | --- |
| 0:00 | Página de agendamento do salão | No celular da cliente: o link do salão | "Do outro lado, a cliente abre o link do salão no celular." |
| 0:08 | Escolhe o serviço | Ela escolhe o serviço e vê só os horários livres | "Escolhe o serviço e vê só os horários livres." |
| 0:17 | Escolhe o horário | Escolhe o horário e pronto: o salão recebe o pedido | "Escolhe o horário e pronto: o salão recebe o pedido." |

## Cena final (4 s)
"Gê. Agenda cheia, cabeça leve. Teste grátis por 14 dias, sem cartão de crédito."

## Cuidados
- Só aparecem dados fictícios (conta de demonstração). Nunca grave com dados de clientes reais.
- Não aparece nenhum valor de plano: os preços ainda estão em definição (tarefa C-01 do `LAUNCH_TRACKER.md`).
- A cena do WhatsApp mostra o cartão de pedido de conexão, não uma conversa real: o WhatsApp ainda não foi validado com a Meta (tarefa P-05). Não grave mensagens reais antes disso.

## Como refazer a gravação
1. Com o app rodando em desenvolvimento e a conta de demonstração, rode:
   `VITRINE_PASSWORD=<senha da conta de demonstração> node materiais-comerciais/video/gravar.mjs`
2. O vídeo sai em `materiais-comerciais/video/saida/ge-apresentacao.mp4` (a pasta fica fora do git).
3. Para mudar uma legenda ou o ritmo de uma cena, edite o `gravar.mjs` (cada cena é um bloco `cena(...)` com as legendas e as pausas).
Precisa do Playwright e do ffmpeg instalados.

## Versão vertical, no iPhone 17 Pro Max (cerca de 2 minutos e 10 segundos)
Para Reels e TikTok (1080 × 1920). É o app de verdade com a tela do iPhone 17 Pro Max (440 × 956 pontos), conduzido com **toques e deslizes de dedo** (o círculo na tela é o dedo). A moldura do aparelho, a ilha dinâmica e a barra de status são desenhadas em volta. É uma emulação do tamanho e do toque do iPhone, não o Safari de um aparelho físico.

| Cena | Na tela | Legenda |
| --- | --- | --- |
| Página de vendas | Rola pelo topo, a demonstração de agendamento e o carrossel de recursos | A Gê no celular: a agenda de quem trabalha com beleza; A cliente marca sozinha, só em horários livres; Lembrete com confirmação pelo WhatsApp do salão |
| Entrar | Digita e-mail e senha | A dona do salão entra no painel |
| Início | Saudação do dia e resumo | Todo dia uma saudação nova e o resumo do dia; Quanto entrou, quanto está previsto e quem sumiu |
| Agenda | Lista do dia e um atendimento aberto | Agenda do dia, sem conflito de horário; Um toque abre o atendimento: serviços, valor e pagamento |
| Menu e WhatsApp | Menu "Mais" e a tela do WhatsApp | No menu, as configurações do salão; WhatsApp pelo número do próprio salão: você pede e a equipe da Gê configura com você |
| Clientes | Lista e importação de planilha com prévia | Clientes: histórico e quem não volta há tempo; Trouxe sua lista de outro sistema? Importe a planilha; A Gê mostra quem entra e o que tem erro, antes de gravar |
| Do outro lado | A cliente abre o link do salão e escolhe o serviço e o horário | Do outro lado, a cliente abre o link do salão; Escolhe o serviço e vê só os horários livres; Escolhe o horário e o salão recebe o pedido |

Para refazer: `VITRINE_PASSWORD=<senha da conta de demonstração> node materiais-comerciais/video/gravar-iphone.mjs`. O vídeo sai em `materiais-comerciais/video/saida-iphone/ge-iphone.mp4` (fora do git).
