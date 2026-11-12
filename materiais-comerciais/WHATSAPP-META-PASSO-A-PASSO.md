# WhatsApp de verdade: o que fazer na Meta e na Gê (P-05) e no agendador (P-06)

**Estado em 12/11/2026:** o lado da Gê está pronto (P-04 fechada): a página `/admin/whatsapp` abre para você e a chave de criptografia existe. **O WhatsApp nunca foi testado com a Meta real.** Os nomes de botões e telas da Meta mudam com frequência: onde algo não bater com a tela, siga o sentido do passo e me mande um print.

**Regra de segurança:** token e segredo da Meta **nunca** vão para o chat, nem para e-mail ou print. Eles se colam **só** no formulário de `/admin/whatsapp` (que os criptografa) ou em campos da própria Meta.

## O que você precisa antes
- Uma conta pessoal do Facebook (para entrar na Meta).
- Um portfólio empresarial da Meta (grátis) e um **aplicativo** no Meta for Developers.
- Um **número de teste**: a própria Meta oferece um número de teste no começo, que serve para provar o fluxo **sem** usar o seu chip. Ele só envia para números que você cadastrar como destinatários de teste (a Meta limita a quantidade; **confirmar na tela**).
- Para mandar para **qualquer cliente** (produção), a Meta pede a **verificação da empresa**, que exige documentos da empresa (CNPJ). Isso depende da **L-02** (abrir a empresa, falar com o contador). **Não bloqueia o teste.**
- Custo: o teste não deve cobrar, mas as mensagens de verdade têm **tabela de preços da Meta**. **Confirmar na página de preços da Meta antes de ativar**; é um gasto, e decisão sua (F-03).

## Parte 1: a Meta (você, uns 30 a 40 minutos)
1. Entre em `business.facebook.com` e crie o **portfólio empresarial** (nome da Gê). 
2. Entre em `developers.facebook.com` → **Meus aplicativos** → **Criar aplicativo** → tipo **Empresa** (Business), ligado ao portfólio do passo 1.
3. No aplicativo, **Adicionar produto** → **WhatsApp** → **Configurar**.
4. Na tela de configuração do WhatsApp (chamada "Introdução" ou "API Setup") você vê:
   - o **número de teste** que a Meta criou;
   - o **ID do número de telefone** (Phone number ID);
   - o **ID da conta do WhatsApp Business** (WABA ID).
   **Anote os dois IDs** (não são secretos como o token, mas não publique).
5. Em **Para** (To), **adicione o seu próprio WhatsApp** como destinatário de teste e confirme com o código que chega.
6. **Token que não vence** (o do passo 4 da tela dura só 24 horas): no portfólio, **Configurações do negócio** → **Usuários do sistema** → **Adicionar** (função de administrador) → **Adicionar ativos** (o aplicativo e a conta do WhatsApp, com controle total) → **Gerar token**, escolhendo o aplicativo, **sem expiração**, com as permissões `whatsapp_business_management` e `whatsapp_business_messaging`. **Copie o token uma vez e guarde no gerenciador de senhas**: a Meta não mostra de novo.
7. (Opcional, recomendado) **Segredo do aplicativo**: Configurações do aplicativo → **Básico** → **Chave secreta** → mostrar. Serve para a Gê conferir a assinatura das mensagens que chegam.

## Parte 2: a Gê (você, 5 minutos)
1. Em `https://bss-six.vercel.app/admin/whatsapp` (logada como administradora), use **Conectar agora** para o estabelecimento de teste (o código do link do salão de demonstração) e cole: o **ID do número**, o **ID da conta (WABA)** e o **token**. O segredo do aplicativo é opcional.
2. A Gê confere o número com a Meta e **cria os 3 modelos de mensagem** (`ge_confirmacao`, `ge_lembrete`, `ge_cancelamento`, categoria "Utilidade"). A Meta analisa em algumas horas até 2 dias; a tela mostra a situação de cada um.
3. A página mostra o **endereço do webhook** e um **texto de verificação** (um por estabelecimento). Copie os dois.

## Parte 3: voltar à Meta para ligar as respostas (3 minutos)
1. No aplicativo da Meta: **WhatsApp** → **Configuração** → **Webhook** → **Editar**.
2. **URL de retorno:** `https://bss-six.vercel.app/api/whatsapp/webhook`. **Token de verificação:** o texto que a Gê mostrou. Salvar. (A Meta chama o endereço na hora: se der erro, o texto ou o endereço estão errados.)
3. Em **Campos do webhook**, **assine** o campo **messages**.

## Parte 4: o primeiro teste (quando os 3 modelos estiverem **Aprovados**)
1. No app como o salão de demonstração, crie um atendimento para o **seu número** (o cadastrado como destinatário de teste), para daqui a algumas horas.
2. O lembrete é enviado pelo agendador (**Parte 5**). Você recebe a mensagem de confirmação no WhatsApp.
3. Responda **"Confirmo"**: o atendimento deve mudar para **Confirmado** no app.
4. Me diga o resultado. Se algo falhar, eu olho o registro do app e o webhook.

## Parte 5: o agendador de mensagens (P-06)
O agendador é um relógio gratuito do GitHub que chama o app a cada 5 minutos. Hoje ele roda "verde" **sem fazer nada**, porque falta o `CRON_SECRET` no GitHub. O valor que está na Vercel é secreto e **ninguém consegue ler de volta**, então a saída é criar um valor **novo** nos dois lugares:
1. Gere uma senha aleatória de 40 caracteres no gerenciador de senhas.
2. **Vercel:** projeto `bss` → Settings → Environment Variables → `CRON_SECRET` → **⋯** → **Edit** → cole o valor novo → Save (mantenha **Sensitive** e **Production**).
3. **GitHub:** repositório `290784/bss` → Settings → **Secrets and variables** → **Actions** → **New repository secret** → nome `CRON_SECRET`, **o mesmo valor** → Add secret.
4. **Redeploy** de Produção (eu faço com a sua aprovação).
5. Para conferir: GitHub → aba **Actions** → "mensagens" → um dos últimos rodou **sem erro de autorização** (um 401 significa que os valores diferem).

## O que me avisar (sem colar nada secreto)
- "Parte 1 pronta" (só isso, sem os IDs, que você cola direto no formulário), e qualquer erro com o print.
- Eu acompanho e confiro o que dá para ver do meu lado.

## Sobre a Vercel e o uso comercial
O projeto está no plano **Hobby**, e a documentação deste repositório (`docs/DEPLOY.md`) registra que o **uso comercial exige o plano Pro** pelos termos da Vercel. **Antes de cobrar ou divulgar em escala**, confirme os termos atuais e o custo (F-03): é um gasto que depende da sua decisão.
