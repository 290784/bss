<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regra de merge dos PRs do agente

O dono autorizou, de forma permanente, que o agente **mescle os próprios PRs sem perguntar**, com estas condições:

- **Só quando todos os checks passarem.** Se qualquer check falhar, ou houver conflito de merge, **pare** e avise o dono (qual check, qual erro). Isso inclui a prévia do projeto `bss` na Vercel: se ela falhar, o agente não mescla sozinho, mesmo quando o erro for o de provisionamento ("Resource provisioning failed").
- Método: **squash**. No ambiente em nuvem o `gh pr merge` não funciona (GraphQL bloqueado); use a API REST: `gh api -X PUT repos/290784/bss/pulls/<número>/merge -f merge_method=squash`.
- Depois de mesclar, conferir o deploy de produção (`bss` e `studio-manoella-lopes`) e contar o resultado ao dono.
- **Esta regra não cobre** PRs que dependem de uma decisão do dono: gastos ou contratação de ferramentas, alteração de configuração de produção, envio de mensagens reais, publicação de conteúdo, mudanças jurídicas, fiscais ou financeiras, e alteração de dados reais de clientes. Nesses casos o agente abre o PR e **espera o dono mesclar**.
- **O PR que altera esta própria regra não é mesclado pelo agente.** Só o dono muda o que o agente pode fazer sozinho.
- Nunca expor secrets, tokens, senhas ou chaves de API em PR, commit, log ou mensagem.
