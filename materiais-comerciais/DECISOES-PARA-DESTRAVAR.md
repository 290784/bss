# Decisões e passos que só você pode fazer (e como fazer cada um em poucos minutos)

Tudo o que eu podia adiantar sem a sua aprovação já está pronto. O que sobra precisa de você porque envolve **dinheiro, configuração de produção, mensagens reais, publicação ou assunto jurídico e fiscal**. Em ordem do que mais destrava.

## 1. P-04 · Chaves do WhatsApp e acesso de administradora (5 minutos) — destrava P-05, painel do fundador e lista de espera
**O que é:** duas variáveis na Vercel (projeto `bss`, ambiente Production): `WHATSAPP_ENCRYPTION_KEY` (chave que protege os tokens do WhatsApp no banco) e `PLATFORM_ADMIN_USER_IDS` (quem é administradora da Gê).
**Como fazer:**
1. Entre no app em produção com a sua conta, vá em **Configurações → Conta e privacidade** e copie o **código da conta** (um código longo).
2. Me envie esse código aqui no chat (não é um segredo, é só um identificador) **e** aprove que eu cadastre as duas variáveis. Eu gero a chave aqui, cadastro direto na Vercel e **nunca mostro o valor**. Depois guarde uma cópia no seu gerenciador de senhas pelo painel da Vercel, porque se a chave mudar, as conexões de WhatsApp precisam ser refeitas.
**Risco:** baixo; sem as variáveis, a tela de WhatsApp só avisa que não está habilitada.

## 2. P-06 · Agendador de mensagens (3 minutos) — destrava os lembretes automáticos
**O que é:** um segredo que autoriza o agendador do GitHub a chamar o app a cada 5 minutos. Hoje ele roda "verde", mas não faz nada.
**Como fazer:** gerar um valor aleatório longo e cadastrar **o mesmo valor** em dois lugares: Vercel (variável `CRON_SECRET`, Production) e GitHub (repositório → Settings → Secrets and variables → Actions → New repository secret → `CRON_SECRET`). Se você aprovar, eu cadastro a da Vercel; a do GitHub precisa ser você (eu não consigo criar segredos lá), colando o valor que combinarmos por um canal seguro.

## 3. V-04 e V-05 · Primeiras conversas no Rio — gera os primeiros dados reais
1. Monte os 100 perfis (lash e nail designers do Rio) seguindo `GUIA-LISTA-RIO.md` e a planilha `PLANILHA-PROSPECCAO.csv`. Pode delegar para uma pessoa de confiança; eu não acesso o Instagram.
2. Leia `MENSAGENS-ABORDAGEM.md`, escolha a versão e **aprove o envio das 20 primeiras** (você ou a pessoa enviam; eu não envio mensagens reais). Use um código de canal diferente por canal (`CODIGOS-DE-CANAL.md`).
3. Nas conversas, use `ROTEIRO-ENTREVISTAS.md`, `ROTEIROS-DEMONSTRACAO-E-CONFIGURACAO.md` e registre tudo na planilha.

## 4. C-01 · Preço inicial a testar
**Minha recomendação (você decide): começar a conversa com R$ 69 por mês para o plano Pro**, o do meio das três faixas da estratégia (R$ 49, R$ 69, R$ 89), e **testar as três** nas demonstrações com a pergunta de preço do roteiro (V-08). Motivo: é o valor que menos distorce a resposta (não é "barato demais" nem assusta), e os dados reais dizem se sobe ou desce. Responda "69", "49", "89" ou outro valor. Eu atualizo a página de preços (C-02) e a planilha financeira.

## 5. F-01 e F-02 · Cobrança e e-mail (contratar ferramenta: só você aprova)
**Não tenho acesso às páginas de preços atuais daqui**, então confirme as tarifas nos sites oficiais antes de decidir. Critérios que importam: Pix recorrente e cartão, cobrança automática mensal, repasse em dias, taxa por transação, API simples, suporte em português.
- **Cobrança (F-01):** Asaas é a opção brasileira mais comum para assinatura com Pix e cartão e costuma ser a mais simples de integrar; Stripe tem a melhor API, mas confira o Pix recorrente; Iugu e Pagar.me são alternativas. **Minha sugestão para começar: Asaas**, desde que as tarifas oficiais estejam ok para você.
- **E-mail (F-02):** Resend (simples, bom para começar, plano grátis para volume pequeno, a confirmar no site) ou Postmark (muito bom em entrega, pago desde o início).
Depois da sua escolha e de você criar a conta, eu preparo a integração (P-08 e P-09). Não crio conta nem gasto sem sua aprovação.

## 6. F-03 · Orçamento
A proposta é de R$ 7.750 em 90 dias (enxuto), como está no tracker. Posso trabalhar com um teto menor e liberar por etapas. Diga o teto e se prefere liberar tudo ou em etapas. A `PLANILHA-FINANCEIRA.xlsx` já tem a linha para acompanhar.

## 7. Jurídico e fiscal (você ou profissionais; eu só preparo o material)
- **L-01 (nome "Gê"):** consulta de marca no INPI (busca de anterioridade, classes 9, 35 e 42). Pode ser você mesma na busca gratuita do INPI, ou um(a) advogado(a).
- **L-02 (empresa e contador):** necessário para verificar a conta da Meta (P-05) e emitir nota. Converse com um contador sobre o enquadramento.
- **L-03 (revisão dos textos legais):** contratar revisão dos Termos e da Privacidade. Enquanto isso, a política **não cita a lista de espera**. Sugestão de parágrafo para o revisor avaliar, **não publicar sem revisão**: "Lista de espera: quando você pede para testar a Gê, guardamos seu nome, WhatsApp e tipo de atividade para te chamar sobre o teste. Você pode pedir a exclusão a qualquer momento pelo contato abaixo." 
- **L-04 (encarregado de dados):** definir quem responde pelos dados (pode ser você no começo) e publicar o contato na política.

## 8. Pequenas respostas
- **C-04:** os dias e horários de atendimento do Pedro Chaves (suporte).
- **V-06:** confirmar que o login da conta de demonstração funciona em produção (usuário `vitrine@beautyos.dev`). A conta já está com os nomes novos.
- **M-05:** os perfis de Instagram e TikTok da Gê (para eu preparar bio e link com código de canal).
