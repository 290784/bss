# Backup e monitoramento (P-13)

Estado verificado em 12/11/2026. **Não consegui consultar o plano nem os backups do banco daqui** (o acesso é ao painel do Neon, na conta do dono). Onde diz "confirmar", é uma ação sua no painel.

## O que já existe no app
- **Endereço de saúde:** `GET /api/saude` responde `200 {"ok":true}` quando o app e o banco funcionam e `503 {"ok":false}` quando o banco não responde. Não mostra mais nada. Serve para ferramentas de monitoramento.
- **Registros de execução:** os logs do app ficam na Vercel (aba Logs). O tempo de guarda depende do plano da Vercel (**confirmar**).
- **Auditoria no banco:** ações críticas (exportações, remoções, conexão de WhatsApp) ficam em `app.audit_log`, sem dados pessoais.
- **Migrações versionadas** em `db/migrations/`, rodadas no build.

## Monitoramento: o que ligar (nenhum custo é obrigatório)
1. **Monitor de disponibilidade:** uma ferramenta que chame `https://SEU-DOMINIO/api/saude` a cada 5 minutos e avise por e-mail ou mensagem quando falhar. Existem ferramentas com plano grátis (por exemplo UptimeRobot ou Better Stack: **confirmar os limites atuais nos sites**). Basta cadastrar o endereço e o contato para o alerta.
2. **Alternativa pelo Make (que você já usa):** um cenário que chama o endereço de saúde e, se não vier `200`, manda mensagem no Telegram. **Atenção ao plano do Make:** cada verificação gasta operações; a cada 15 minutos são cerca de 6 mil por mês, o que pode passar do limite do plano grátis (**confirmar o limite**). Eu monto se você quiser.
3. **Erros do app:** olhar a aba Logs da Vercel quando o monitor avisar. Uma ferramenta de erros dedicada (como Sentry) é contratação e pode envolver custo e dados de usuárias: depende da F-03.

## Backup do banco (Neon)
- **O que fazer agora, sem custo:** entrar no painel do Neon e **anotar** (1) o plano, (2) quantos dias de histórico de restauração o plano dá e (3) se há backup agendado. Essas três respostas definem tudo.
- **Teste de restauração (faça uma vez antes de ter clientes pagando):** criar uma ramificação (branch) do banco a partir de um ponto no tempo, abrir o app apontando para ela e conferir que os dados estão lá. Backup que nunca foi restaurado não é backup.
- **Cópia extra (opcional):** um `pg_dump` periódico guardado fora do Neon. **Cuidado:** a cópia tem dados pessoais de clientes finais. Guardar em lugar privado e criptografado, com prazo de guarda definido e citado na política de privacidade (L-03). **Não colocar essa cópia como artefato de GitHub Actions**, porque artefatos são mais fáceis de vazar e ficam guardados por padrão.
- **Perguntas que o dono decide (F-03):** quanto de dado a Gê aceita perder (ex.: no máximo 1 dia) e quanto tempo aceita ficar fora do ar (ex.: algumas horas). Com isso, escolhe-se o plano e a rotina.

## Plano de resposta rápido (se o app cair)
1. Abrir `/api/saude`: se `503`, o problema é o banco; se não abre, é o app ou a Vercel.
2. Vercel → Deployments: houve um deploy recente com erro? Se sim, **Redeploy** do último que funcionava (promover o anterior).
3. Neon → Monitoring: o banco está de pé? Se não, abrir chamado no suporte.
4. Avisar as usuárias com uma mensagem curta e honesta, sem prometer horário.
