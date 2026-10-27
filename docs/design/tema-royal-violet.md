# Tema "Royal Violet" — identidade da Gê

Referências: escala de violetas enviada (#EACFFC → #3C0561) e o cartão "Royal Violet"
(degradê #02060E ↔ #9303C5, cards muito arredondados com contorno branco fino, letra cursiva).

## Tokens (`src/app/globals.css`)
| Papel | Token | Valor |
|---|---|---|
| Noite (base dos degradês) | `night` | #02060E |
| Violeta real | `royal` | #9303C5 |
| Escala da marca | `violet-100…800` | #EACFFC #D59EFA #C06EF7 #AB3DF5 #960DF2 #780AC2 #5A0891 #3C0561 |
| Fundo da página | `canvas` | #05040D + halos radiais violeta |
| Cards / elevado / afundado | `surface` / `raised` / `sunken` | #0F0B1F / #19122F / #160F2A |
| Texto / secundário / apagado | `ink` / `ink-soft` / `muted` | #F8F0FF / #DCCBF1 / #A995C6 |
| Destaque (semântico) | `accent-*` | sutil, borda, preenchimento (#AB3DF5), forte (#960DF2), texto (#D59EFA) |

Os nomes antigos (`plum-*`, `champagne-*`, `ink-warm`) foram substituídos por nomes semânticos
(`accent-*`, `highlight-*`), para que futuras trocas de paleta mexam só nos tokens.

## Contraste verificado (WCAG, sobre `surface`)
ink 17,4:1 · ink-soft 12,7:1 · muted 7,2:1 · accent-text 9,3:1 · estados de agendamento ≥ 8,9:1 ·
branco sobre o botão (#960DF2) 5,8:1. A cor das barras dos gráficos (#AB3DF5) passou no validador
de paleta para o modo escuro (contraste ≥ 3:1 com a superfície).

## Utilitários
- `bg-royal` / `bg-royal-rev`: degradê diagonal noite → violeta real (cards de destaque, seções, lateral do login, topo da página pública).
- `btn-glow`: botão principal em degradê violeta com brilho.
- `glass` / `ring-glass`: vidro escuro com contorno claro fino (como os cards da referência).
- `text-shimmer`: brilho que percorre o texto (o "Gê" do título).
- `<Sparkles />` / `<Sparkle />` (`src/components/brand/sparkles.tsx`): estrelas de 4 pontas cintilando.
- `font-script` (Allura): nome "Gê", números de "Como funciona" e palavras de ênfase. Nunca em texto corrido.

## Acessibilidade
Animações (cintilar, brilho do texto, carrossel) respeitam `prefers-reduced-motion`.
Brilhos são decorativos (`aria-hidden`). `color-scheme: dark` deixa campos nativos (data/hora) no tema escuro.
