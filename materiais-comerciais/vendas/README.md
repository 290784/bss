# Material de vendas da Gê

Apresentação para chamadas por compartilhamento de tela e manuais do vendedor. **Nada aqui define preço, oferta ou prazo**: o que não está decidido aparece como "em definição" (veja `documents/BSS_COMMERCIAL_PENDING.md`).

## Como usar a apresentação
1. Na pasta `presentation/`: `python3 -m http.server 4310` e abra `http://localhost:4310/index.html` (precisa de servidor por causa do carregamento das notas).
2. Teclas: `→`/Espaço próximo, `←` anterior, `F` tela cheia, `P` abre o **modo apresentador** (outra janela, com notas privadas, próximo slide e cronômetro), `?` ajuda, número + Enter vai ao slide.
3. Compartilhe **só a janela da apresentação**. As notas existem apenas em `?apresentador` (arquivo `notas.js`, carregado só ali).
4. Valores: preencha `presentation/dados-comerciais.js` quando o dono decidir (e troque `precosDefinidos` para `true`).
5. PDF: `?imprimir` + imprimir em 1920×1080. Prontos em `exports/` (PDF de 23 páginas; PPTX com imagens dos slides e as notas, **não editável**).

## Documentos (`documents/`)
Estudo do vendedor (comece por aqui), planos comparativo, playbook de upsell, manual de objeções (18), roteiros de call (10/20/30 min), fechamento, guia do vendedor e pendências comerciais.

## Telas
`capturar.mjs` refaz as capturas reais da conta de demonstração (dados fictícios): `BASE_URL=... VITRINE_PASSWORD=... node capturar.mjs`.
