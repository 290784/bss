# Guia do vendedor: como usar todo o material da Gê

Este guia explica, em ordem, como preparar e conduzir uma call usando o material de `materiais-comerciais/vendas/`. **Leia primeiro `BSS_COMMERCIAL_PENDING.md`**: ele lista o que **ainda não existe** (preços, formas de pagamento, WhatsApp provado com a Meta, várias unidades) e que você **não pode prometer**.

> **Sobre o nome:** o produto se chama **Gê**. "BSS" é só o nome do repositório; os arquivos usam o prefixo `BSS_` por pedido do dono.

## 1. O que tem em cada arquivo
| Arquivo | Para que serve | Quando usar |
| --- | --- | --- |
| `presentation/index.html` | Apresentação visual (23 slides) | Durante a call, com tela compartilhada |
| `presentation/dados-comerciais.js` | Preços, pagamento e suporte (hoje vazios) | **Antes** da call, se algum já estiver definido |
| `documents/BSS_ESTUDO_DO_VENDEDOR.md` | Trilha de estudo, prova e checklist de liberação | **Antes da primeira prospecção** |
| `documents/BSS_CALL_SCRIPTS.md` | Roteiros de 10, 20 e 30 minutos | Preparação e condução |
| `documents/BSS_PLANOS_COMPARATIVO.md` | Planos, diferenças e perfis | Para recomendar o plano |
| `documents/BSS_UPSELL_PLAYBOOK.md` | Upgrade por necessidade | Com clientes já em uso |
| `documents/BSS_OBJECTION_HANDLING.md` | 18 objeções | Quando surgir uma resistência |
| `documents/BSS_CLOSING_PLAYBOOK.md` | Fechamento e condução do teste | Final da call e acompanhamento |
| `documents/BSS_COMMERCIAL_PENDING.md` | O que falta definir | **Antes de tudo** |
| `exports/BSS_PITCH_DECK.pdf` / `.pptx` | Versões para enviar ou editar | Para quem pedir o material |

## 2. Preparar a call (10 minutos antes)
1. Leia as **pendências** (`BSS_COMMERCIAL_PENDING.md`) e relembre as regras: **sem preço inventado, sem promessa de resultado, WhatsApp só com ressalva**.
2. Abra `presentation/index.html` no navegador (Chrome ou Edge). Aperte **F** para tela cheia.
3. Abra o **modo apresentador** em **outra janela**: tecla **P**. Nessa janela você vê as **notas privadas**, o próximo slide e o cronômetro. **Mova essa janela para fora da área que você compartilha.** A janela do deck **nunca mostra as notas**.
4. Se for mostrar o produto ao vivo, use a conta de demonstração (dados fictícios).
5. Escolha o roteiro pelo tempo: 10, 20 ou 30 minutos.

## 3. Como navegar no deck
| Tecla | Ação |
| --- | --- |
| `→` `Espaço` `PageDown` | Próximo slide |
| `←` `PageUp` | Slide anterior |
| `Home` / `End` | Primeiro / último slide |
| `1` a `9` + `Enter` (ou `G`) | Ir para o slide pelo número |
| `F` | Tela cheia |
| `P` | Abrir o **modo apresentador** (notas privadas) |
| `?` | Mostrar a ajuda de atalhos |
O progresso aparece numa barra fina no rodapé. O endereço guarda o slide (`#/12`), então dá para voltar ao ponto exato.

## 4. Slides de apoio (pule o que não serve)
- **Dor é falta/confirmação:** slides 2, 3, 8 e 11.
- **Dor é organização:** 2, 6, 7.
- **Dor é controle e clientes:** 9 e 10.
- **Dúvida de segurança:** 13.
- **Equipe:** 14 a 18.
- Preço e pagamento: **20** (condição oficial, sem valores inventados).

## 5. Os cálculos do slide 3
O slide 3 tem uma calculadora com **valores de exemplo** (marcados como hipotéticos). **Troque pelos números dela** (ticket e faltas por mês) durante a call. Os números do exemplo **não são da Gê** nem de nenhuma cliente.

## 6. Quando os preços forem definidos
Edite `presentation/dados-comerciais.js`: preencha `precosDefinidos: true`, o preço de cada plano e as formas de pagamento. O slide 20 mostra os valores e o slide 15 (comparação) também. Enquanto `precosDefinidos` for falso, o deck mostra a condição oficial (teste grátis, sem cartão, aviso antes de cobrar), e **o modo apresentador exibe um aviso** lembrando que o preço não está definido.

## 7. Frases que você pode e não pode dizer
| Pode dizer | Não pode dizer |
| --- | --- |
| "Teste grátis de 14 dias, sem cartão." | "Vai aumentar seu faturamento em X%." |
| "Ajuda a reduzir faltas." | "Elimina as faltas." |
| "O lembrete é ativado junto com a nossa equipe." | "O WhatsApp já funciona para todo mundo." |
| "Os valores estão em definição." | Qualquer preço ou desconto. |
| "A gestão de várias unidades está em desenvolvimento." | "O Business já tem várias unidades." |
| "Você pode exportar seus dados quando quiser." | "Nunca perde dados" (não prometa o que não foi medido). |

## 8. Depois da call
1. Registre na `PLANILHA-PROSPECCAO.csv` (dor, plano recomendado, objeção, próximo passo, data).
2. Envie o link do teste e confirme a chamada de configuração (script no playbook de fechamento).
3. Siga a cadência de 14 dias (dia 0, 1, 3, 7, 10, 13, 14).
4. Se aparecer uma pergunta sem resposta, **anote e traga ao dono** em vez de improvisar.

## 9. Quando alguma coisa não bate
Se o produto fizer algo diferente do que está aqui, **o produto vence**: avise o dono para atualizar o material. Se faltar uma informação comercial (preço, suporte, política), ela está em `BSS_COMMERCIAL_PENDING.md`.
