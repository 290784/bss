# Privacidade: mapa dos dados e rascunho de texto para o revisor jurídico (L-03 e L-04)

**Isto é um rascunho técnico para um(a) advogado(a) revisar. Não é parecer jurídico e não deve ser publicado como está.** O texto atual da política (`src/app/privacidade/page.tsx`, versão de 27/10/2026) **não cita**: a lista de espera da landing, o tratamento por Make, Google e Telegram, a origem do cadastro (canal) nem as exportações. Antes de divulgar a landing, isso precisa ser resolvido. Eu não alterei a política: mudança jurídica é decisão sua, com revisão.

## 1. Mapa dos dados (o que a Gê trata hoje, e onde)
| # | Quem é a pessoa | Quais dados | Para quê | Onde fica / quem mais recebe |
| --- | --- | --- | --- | --- |
| 1 | **Usuária da Gê** (profissional ou equipe) | Nome, e-mail, senha (só hash), apelido, registros de acesso, ações de auditoria | Dar acesso ao app e proteger a conta | Banco de dados (Neon, via Vercel); app hospedado na Vercel |
| 2 | **Cliente final do salão** | Nome, telefone, e-mail, nascimento (opcional), histórico de agendamentos e pagamentos, consentimentos | O salão agenda e atende (a Gê é **operadora**, o salão é **controlador**) | Mesmo banco; WhatsApp da Meta quando o salão ativa (mensagens) |
| 3 | **Pessoa na lista de espera** (landing) | Nome, WhatsApp, atividade, **código do canal** (de qual link veio), data e hora, aceite de contato | A equipe da Gê chamar no WhatsApp para ajudar a testar | Banco; **Make** (automação); **Google Sheets** (planilha na conta do Make); **Telegram** (aviso ao dono, com nome, atividade, WhatsApp e canal) |
| 4 | **Quem se cadastra** | Origem do cadastro: código do canal e resposta de "como conheceu" (sem dados pessoais nesses dois campos) | Saber de onde vêm os cadastros | Tabela de eventos do banco |
| 5 | **Quem pede recuperação de senha ou confirma e-mail** (quando o provedor de e-mail for ativado, F-02) | E-mail e um link de uso único (só o hash fica no banco) | Recuperar a conta | Provedor de e-mail a escolher (F-02) |
| 6 | **Visitante da landing** | Código do canal fica no aparelho (armazenamento local) até o cadastro | Medir a origem | Aparelho da pessoa |
| 7 | **Titular que pede os dados** | Exportações em CSV de clientes, agenda e pagamentos, feitas pelo salão | Portabilidade e controle do salão | Download pelo próprio salão; fica registrado na auditoria |

**Operadores e suboperadores a listar (confirmar com o revisor):** Vercel (hospedagem), Neon (banco de dados), Make (automação), Google (Sheets), Telegram (avisos internos), Meta (WhatsApp, quando ativado pelo salão), provedor de e-mail (futuro) e provedor de cobrança (futuro). Alguns têm servidores fora do Brasil: o revisor deve avaliar a **transferência internacional** de dados.

## 2. Rascunho de parágrafos (para o revisor ajustar)
**Lista de espera.** "Quando você pede para testar a Gê pela nossa página, usamos seu nome, WhatsApp e tipo de atividade para entrar em contato com você sobre o teste. Também guardamos o código do link pelo qual você chegou, para sabermos qual divulgação funciona. A base legal é o seu consentimento, dado ao marcar a caixa do formulário, e você pode retirá-lo a qualquer momento pelo canal de contato abaixo, quando pediremos a exclusão dos seus dados da lista."

**Ferramentas de apoio.** "Para organizar esses pedidos, usamos serviços de terceiros que atuam como operadores sob nossas instruções: uma ferramenta de automação (Make), uma planilha (Google Sheets) e um aplicativo de mensagens (Telegram) para avisar a equipe. Esses serviços podem armazenar dados em servidores fora do Brasil."

**Origem do cadastro.** "Registramos, sem dados pessoais, o código do link e a resposta de 'como conheceu a Gê' para entender de onde vêm os cadastros."

**Prazo de guarda da lista de espera.** "Guardamos os dados da lista de espera por [prazo a definir pelo revisor, por exemplo 12 meses] ou até você pedir a exclusão, o que ocorrer primeiro."

**Contato e encarregado.** "Para exercer seus direitos ou tirar dúvidas, escreva para [e-mail de contato]. O encarregado de dados é [nome e contato] (L-04)."

## 3. Perguntas para o revisor decidir
1. Basta o consentimento para a lista de espera, ou há outra base mais adequada?
2. Qual o **prazo de guarda** da lista de espera e do aviso no Telegram e na planilha?
3. É preciso um **termo de operador** (acordo de tratamento) com Make, Google, Telegram, Vercel e Neon, ou os termos padrão deles bastam? E como tratar a **transferência internacional**?
4. A Gê é controladora ou operadora no caso da lista de espera? (Minha leitura: **controladora**, pois os dados são para a própria Gê.)
5. O aviso sobre o uso do Telegram precisa estar **na hora do aceite** (no formulário), e não só na política?
6. Como atender pedido de exclusão: hoje há solicitação de exclusão anotada para a usuária; a lista de espera e a planilha precisam de um passo manual.
7. Quem será o **encarregado** (L-04) e qual contato público?

## 4. Ajustes técnicos que eu faço assim que o texto estiver aprovado
- Publicar o texto aprovado na política e nos Termos.
- Incluir um **link para a política** na caixa de aceite do formulário da lista de espera.
- Se o revisor pedir, **parar de enviar o WhatsApp ao Telegram** (mandar só nome e atividade) ou trocar o aviso por outro canal.
- Criar a rotina de **exclusão** (banco e planilha) quando alguém pedir.
- Registrar o prazo de guarda e apagar automaticamente o que vencer.

## 5. O que fica da sua conta (assuntos que eu não decido)
Contratar a revisão, escolher o encarregado, definir o e-mail de contato público e aprovar o texto final. Enquanto isso, **não divulgue a landing** (nem os links com código de canal) para o público.
