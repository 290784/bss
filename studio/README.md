# Site do studio (links · agendamento · manual · guia)

Ecossistema web mobile-first para um studio de beleza, com a identidade visual **BSS**:

| Rota | O que é |
|---|---|
| `/` | Página de links (estilo Linktree): perfil, WhatsApp, Instagram e os 3 caminhos |
| `/agendar` | Serviços em acordeão (duração, valor, profissional) → **Agendar pelo WhatsApp**; contato; horários com selo **Aberto/Fechado** em tempo real |
| `/manual` | Manual de Agendamento (7 seções) + **Baixar PDF** + **Compartilhar** |
| `/guia` | Guia de Cuidados (4 seções) + **Baixar PDF** + **Compartilhar** |

Vite + React + TypeScript + React Router + Tailwind 4 · PWA (instalável, funciona offline) · PDFs gerados no navegador com `@react-pdf/renderer` · sem backend.

## Comandos

```bash
npm install
npm run dev          # desenvolvimento (http://localhost:5173)
npm run build        # typecheck + build de produção em dist/
npm run preview      # serve o build (http://localhost:4173)
npm run lint         # ESLint (bloqueia cor hex solta fora dos tokens)
npm test             # testes unitários (horários, mensagem, conteúdo, tokens, contraste, PDFs)
npm run test:e2e     # fluxo completo no navegador (precisa do preview rodando)
npm run icons        # regera ícones do app e imagem de compartilhamento (precisa do Playwright)
```

## Editar o conteúdo — `src/data/studio.ts`

**Todo** texto, preço, horário, regra, link e foto vem desse arquivo (tipos em `src/data/types.ts`). Trocar de cliente = trocar esse arquivo; o site **e os PDFs** mudam juntos.

- **Preços** em centavos (`14000` = R$ 140,00).
- **Horários**: `faixas` com `dia` (0 = domingo … 6 = sábado), `abre` e `fecha` em `"HH:MM"`, no fuso `horarios.fuso`. O selo Aberto/Fechado usa sempre o fuso do studio, não o do aparelho.
- **Mensagem do WhatsApp**: `agendamento.mensagemWhatsApp`, com `{servico}`, `{duracao}`, `{valor}` e `{profissional}`.
- **Manual e Guia**: cada seção é uma página do PDF. Blocos disponíveis: `paragrafo`, `lista`, `topicos`, `destaque` (com `acao: "whatsapp"`), `dicas`, `fotos`, `assinatura`, `valores`, `localizacao`, `logo`. Se uma seção ficar longa demais para uma página, o teste `src/pdf/pdf.test.tsx` avisa (ele confere 7 e 4 páginas).
- **Fotos**: coloque os arquivos em `public/img/` e troque o `src`; tire o `placeholder: true`. Fotos em JPG/PNG entram no PDF; as provisórias aparecem como quadro "Foto provisória".
- **Logo**: sem arquivo, o site usa o monograma + o nome na fonte de assinatura do BSS. Com arquivo SVG em `public/brand/`, preencha `marca.logo`.
- **SEO**: `seo` define título e descrição de cada rota (vão para o HTML estático e para o preview do link).

Depois de editar: `npm test` confere se o conteúdo continua coerente, e `npm run icons` atualiza a imagem de compartilhamento.

## Trocar a identidade visual (BSS)

A fonte de verdade é o app BSS (tema "Gê / Royal Violet", `../src/app/globals.css`). Aqui ela fica em dois arquivos que **precisam andar juntos** (um teste confere):

1. `src/theme/tokens.ts`: paleta escura (padrão) e clara, degradê da marca, fontes, escala e raios. É usado pelos PDFs.
2. `src/theme/theme.css`: os mesmos valores como variáveis do Tailwind (`bg-superficie`, `text-texto-suave`, `rounded-card`…).

Regras: componentes só usam essas classes (o lint recusa cor hex fora de `src/theme`); contraste AA conferido em teste para os dois temas. Fontes: DM Sans (texto), Inter Tight (títulos) e Allura (assinatura), servidas localmente pelo `@fontsource`.

## Publicar na Vercel

1. Na Vercel: **Add New → Project**, escolha este repositório e em **Root Directory** selecione `studio`. O `vercel.json` já define build (`npm run build`), saída (`dist`), URLs limpas, cache e cabeçalhos de segurança.
2. (Recomendado) Em **Settings → Environment Variables**, defina `SITE_URL` com o domínio final (ex.: `https://studiomanoellalopes.com.br`). Sem ela, o build usa o domínio de produção da Vercel; é o que entra no canonical, no Open Graph e no `sitemap.xml`.
3. Domínio próprio: **Settings → Domains**.

O link para colocar na bio do Instagram é a página inicial (`/`).

## Como funciona

- **Agendamento (fase 1)**: `src/services/booking.ts` monta o link `wa.me` com a mensagem pronta. A interface `BookingProvider` isola isso — uma agenda real (fase 2) entra como outro provedor, sem mudar as páginas.
- **Aberto/Fechado**: `src/utils/openingHours.ts` (abre às `abre` inclusive, fecha às `fecha` exclusive), atualizado a cada minuto.
- **PDF**: `src/pdf/` (`ManualPdf.tsx`, `GuiaPdf.tsx`, `base.tsx`). Capa e encerramento no degradê da marca; páginas de conteúdo na paleta clara do BSS (melhor para ler e imprimir). O gerador (~1,2 MB) só carrega ao tocar em **Baixar PDF**.
- **SEO sem servidor**: o build gera um HTML por rota (`/agendar`, `/manual`, `/guia`) com título, descrição e Open Graph — o preview do link no WhatsApp/Instagram não executa JavaScript.
- **PWA**: manifest com atalhos para as 3 rotas, ícones e service worker (offline).

## Qualidade (medido no build de produção)

- Lighthouse mobile: Desempenho 93–95 · Acessibilidade 100 · Boas práticas 100 · SEO 100 nas 4 rotas.
- 62 testes unitários + 24 checagens de ponta a ponta (incluindo baixar os dois PDFs reais e conferir 7 e 4 páginas).
