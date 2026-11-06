# Peças visuais da Gê

Primeiro conjunto de imagens para Instagram e TikTok, feito com a identidade do site: fundo creme e ameixa, dourado nos destaques, títulos em Playfair Display, texto em Nunito e a assinatura "Gê" em Allura. Os textos vêm do calendário de 30 dias (`../CALENDARIO-CONTEUDO-30-DIAS.md`). **Nada foi publicado:** publicar exige a sua aprovação (tarefa M-04).

## Ver tudo de uma vez
Abra **`visualizar.html`** com duplo clique (funciona sem internet; está tudo dentro do arquivo). É uma galeria: toque ou clique para ampliar, use as setas para passar e o botão "Baixar" para salvar cada imagem. O arquivo é refeito toda vez que você roda o `gerar.mjs`.

## O que tem na pasta `png/`
| Arquivo | Tamanho | Uso |
| --- | --- | --- |
| `01-foto-de-perfil.png` | 1080 × 1080 | Foto de perfil do Instagram e do TikTok (as plataformas recortam em círculo; o "Gê" já fica no meio) |
| `carrossel-dia02-5-jeitos-1.png` a `-7.png` | 1080 × 1350 | Carrossel do dia 2: "5 jeitos de reduzir falta sem brigar com cliente" (capa, 5 jeitos e fechamento) |
| `post-dia12-cobrar-o-que-vale.png` | 1080 × 1350 | Post do dia 12: "Cobrar o que vale é profissionalismo." |
| `stories-dia11-1.png` a `-5.png` | 1080 × 1920 | Sequência de 5 Stories do dia 11 (convite para o beta) |
| `reels-capa-dia01-ela-avisou.png` | 1080 × 1920 | Capa do Reels do dia 1 |
| `reels-capa-dia04-cliente-marcando.png` | 1080 × 1920 | Capa do Reels do dia 4 |

O carrossel tem 7 telas, e não 6 como o calendário descreve: são 5 jeitos mais capa e fechamento.

## Antes de publicar, confira
- **Stories do dia 11:** o "15 vagas no beta" só vale se o beta existir e tiver as vagas. O "R$ 150" e as "3 faltas por mês" são um **exemplo** (já escrito na imagem); troque pelo seu ticket real, se quiser.
- **Dados de exemplo:** nomes como Ana e Bia, horários e valores nas imagens são fictícios, de propósito. Nunca coloque dados de clientes reais.
- **Stories e Reels:** os textos ficam no miolo da imagem, longe das bordas, para não serem cobertos pela interface do app.
- **Link do Stories 5:** adicione o botão de link pelo próprio Instagram.

## Como mudar um texto ou criar uma peça nova
1. Abra `gerar.mjs` e edite o texto no bloco da peça (cada peça é um `add(...)`).
2. Na raiz do repositório, rode: `node materiais-comerciais/visual/gerar.mjs`.
3. As imagens novas aparecem em `png/` e as versões em HTML, abríveis no navegador, em `fonte/`.

Precisa do Playwright instalado (`npm install -D playwright` e `npx playwright install chromium`). As cores e as fontes ficam no início do `gerar.mjs`.

## Fontes
As três fontes (Playfair Display, Nunito e Allura) estão em `fontes/` e têm licença SIL Open Font License, que permite uso comercial e redistribuição.

## O que ainda não existe
Capas de destaques do Instagram, peças dos dias restantes do calendário e vídeos de demonstração (gravação de tela do produto). Tarefa M-08 do `LAUNCH_TRACKER.md`.
