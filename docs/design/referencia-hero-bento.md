# Referência visual: hero animado + seção em blocos (bento)

Base: documento de inspeção de 27/10/2026 (@Gizele Lima) sobre uma landing de app de compras.
Aplicado em `src/app/page.tsx` e `src/components/marketing/`. Adotamos **padrões**, não a marca:
nenhum logotipo, texto, cor-assinatura ou produto de terceiros foi copiado.

## O que foi adotado
| Padrão do documento | Como ficou no Beauty OS |
|---|---|
| Hero em 2 colunas (texto ≈ 10% da borda, widget à direita) | `max-w-[1240px]`, texto à esquerda, `HeroWidget` à direita; empilha no celular |
| Tile da marca substituindo uma palavra no título ("K.") | "Conheça o [B] OS." — tile ameixa com o "B" do logotipo |
| Base quase monocromática, preto quente | `--color-ink-warm: #15100b`; botões pretos com cantos ≈ 8 px; pílulas na navegação |
| Carrossel de 5 cards com dock de ícones em arco | Lembretes, Agendamento online, Faturamento, Clientes de volta, Promoções |
| Ícone selecionado ≈ 77 px, vizinhos ≈ 58 px, pontas ≈ 50 px translúcidas e mais baixas | Idem, com transição de 500 ms |
| Halo desfocado com uma cor por card | Lavanda, laranja, rosa, verde, ciano (`--color-halo-*`) |
| Troca por dissolução + escala; card parado ≈ 1,1–1,4 s | `mkt-card-in` 450 ms; permanência de 2,6 s (mais tempo para ler em português) |
| Barras que crescem, linha tracejada de média, degradê verde #1CC96E→#49F49C | Cards "Faturamento" e "Clientes de volta" |
| Adesivo amarelo-limão inclinado ("Arrives today") | "Confirmado!" (#FEF455, −16°) com entrada em escala |
| Selo vermelho de notificação | Selo "1" (#D61C11) no card de lembretes |
| Esqueletos cinza no lugar de texto | Todos os cards usam barras cinza: estrutura sem dados falsos |
| Seção bento: card grande cinza (raio ≈ 20 px) + 2 menores, vão ≈ 39 px | Card `#f2f1ef`, raio 24 px, vão 24 px; os menores têm conteúdo (lembretes e indicadores) |
| Rótulo com ícone ciano + título grotesco ExtraBold com tracking negativo | "Agendamento online" + Inter Tight 800 |
| Demonstração em etapas: busca vazia → digitação → sugestões → resultados → grade → detalhe | `BookingDemo` com o mesmo roteiro, buscando "Sobrancelha" |
| Barra de preço em 3 trechos com marcador e etiqueta verde | "Melhor horário hoje!": faixa de horários livres com etiqueta "14:30 Hoje" |
| Duas formas circulares cinza atrás do widget | `--color-mkt-shape` |
| Tipografia: geométrica arredondada no hero, grotesca pesada nas seções | DM Sans (hero/corpo da landing) e Inter Tight 700/800 (títulos) |

## O que foi deliberadamente diferente
- **Sem prova social inventada:** nada de "60+ milhões", estrelas ou "4.9 (722)". No lugar da avaliação,
  a pílula mostra a duração do serviço.
- **Sem cursor simulado:** o dock é clicável de verdade e o carrossel avança sozinho.
- **Sem marcas de terceiros** (Nike, adidas, Google) nem o rosa-assinatura do "K.".
- **Sem recuo de câmera com desfoque**: é um efeito de vídeo, não de página.
- **Acessibilidade:** respeita `prefers-reduced-motion` (sem autoplay; demo mostra o estado final),
  pausa fora da tela, com a aba oculta e com o mouse em cima; ícones do dock têm rótulo;
  ilustrações sinalizadas como "dados de exemplo".
- O painel (`/app`) mantém o design system próprio (Inter + Fraunces, ameixa). A nova linguagem vale só para a landing.
