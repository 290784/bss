# Códigos de canal: como saber de onde veio cada cadastro

Todo link da Gê que você divulga leva um código no final: `?c=codigo`. Quando a pessoa cria a conta, a Gê guarda esse código (e a resposta de "Como você conheceu a Gê?") no evento `signup.completed`. Assim dá para ver qual canal traz cadastro e qual só traz curtida. O primeiro link que a pessoa abre é o que vale.

Regras do código: só letras minúsculas, números, hífen e sublinhado, até 40 caracteres. Também funciona `?utm_source=codigo`.

## Códigos sugeridos
| Onde você divulga | Link |
| --- | --- |
| Bio do Instagram | `https://SEU-DOMINIO/?c=ig-bio` |
| Mensagem direta no Instagram (abordagem) | `https://SEU-DOMINIO/?c=ig-dm` |
| WhatsApp direto (abordagem) | `https://SEU-DOMINIO/?c=wa-direto` |
| Stories e posts | `https://SEU-DOMINIO/?c=ig-post` |
| Indicação de uma colega | `https://SEU-DOMINIO/?c=indicacao` |
| Evento, curso ou parceria | `https://SEU-DOMINIO/?c=evento-NOME` (ex.: `evento-curso-lash`) |
| Entrevista de validação | `https://SEU-DOMINIO/?c=entrevista` |
| Grupo de WhatsApp de profissionais | `https://SEU-DOMINIO/?c=grupo-wa` |

Troque `SEU-DOMINIO` pelo endereço oficial da Gê. Para separar a cidade ou a parceira, junte ao código (`ig-dm-rj`, `evento-curso-lash`).

## Como ler
A consulta no banco (para o painel do fundador, tarefa P-12):

```sql
select props->>'canal' as canal, props->>'conheceu' as conheceu, count(*) as cadastros
from app.product_events where name = 'signup.completed'
group by 1, 2 order by cadastros desc;
```

Sem dados pessoais: só o código do canal e a resposta escolhida na lista (Instagram, indicação, WhatsApp, Google, evento ou outro).
