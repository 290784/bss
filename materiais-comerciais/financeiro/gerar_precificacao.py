"""Gera ../PLANILHA-PRECIFICACAO.xlsx (margem por plano, equilíbrio e plano de indicação). Uso: python3 gerar_precificacao.py
Células azuis = premissas (editáveis); pretas = fórmulas. Nada aqui é preço oficial: são cenários para decidir a C-01."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

AMEIXA, OURO, AZUL = "642350", "B28E52", "1F4FD8"
BRL = '"R$" #,##0.00'; PCT = "0.0%"; INT = "#,##0"
wb = Workbook()
hd = Font(bold=True, color="FFFFFF"); hf = PatternFill("solid", fgColor=AMEIXA)
inp = Font(color=AZUL, bold=True); thin = Side(style="thin", color="D9CBB0"); bd = Border(top=thin, bottom=thin, left=thin, right=thin)

def head(ws, r, vals):
    for i, v in enumerate(vals, 1):
        c = ws.cell(r, i, v); c.font = hd; c.fill = hf; c.alignment = Alignment(wrap_text=True, vertical="center"); c.border = bd

# ---------- Leia-me
w = wb.active; w.title = "Leia-me"; w.column_dimensions["A"].width = 120
linhas = [
 ("Precificação da Gê: margem por plano, ponto de equilíbrio e plano de indicação", True),
 ("Gerada em 26/11/2026. Os preços dos planos NÃO são oficiais (C-01 está aguardando decisão do dono): aqui são 3 cenários para escolher e testar.", False),
 ("Células azuis = premissas que você muda. Pretas = fórmulas. Cada premissa mostra a FONTE ou diz que é HIPÓTESE.", False),
 ("Verificado nas páginas oficiais em 26/11/2026: Vercel Pro (US$ 20/mês por pessoa que faz deploy); Neon (plano Free sem cartão; Launch por uso, página cita gasto típico de US$ 15/mês); Asaas (sem mensalidade; cartão à vista R$ 0,49 + 2,99%; Pix R$ 2,15 ou R$ 1,08 por cobrança, conforme coluna da tabela); Resend (plano gratuito: 3.000 e-mails/mês e 100/dia).", False),
 ("NÃO verificado: tarifa da Meta por mensagem no Brasil (a tabela em reais é um arquivo CSV que não consegui abrir); câmbio; imposto (depende do enquadramento, falar com contador); quantidade de lembretes por conta.", False),
 ("Resultados (aba Margem) são por conta, por mês, antes de marketing, pró-labore e custos fixos. A aba Equilíbrio cobre os custos fixos. A aba Indicação mostra quanto a comissão custa por indicada.", False),
 ("Não prometa estes números a clientes. São premissas internas.", False),
]
for i, (t, b) in enumerate(linhas, 1):
    c = w.cell(i, 1, t); c.alignment = Alignment(wrap_text=True, vertical="top"); c.font = Font(bold=b, size=14 if b else 11, color=AMEIXA if b else "000000")

# ---------- Premissas
p = wb.create_sheet("Premissas"); head(p, 1, ["Premissa", "Valor", "Fonte / observação"])
P = [
 ("Câmbio (R$ por US$ 1)", 5.50, '0.00', "HIPÓTESE. Atualize com a cotação do dia."),
 ("Vercel Pro (US$/mês)", 20, '0.00', "Verificado em vercel.com/pricing (26/11/2026). 1 pessoa que faz deploy. Hobby é grátis, mas confirme os termos para uso comercial."),
 ("Neon (US$/mês)", 15, '0.00', "Página da Neon cita gasto típico de US$ 15/mês no plano Launch (por uso). O plano Free é US$ 0 e serve para o início."),
 ("Domínio, e-mail e outros fixos (R$/mês)", 30, BRL, "HIPÓTESE. Domínio próprio e e-mail transacional; o Resend tem plano gratuito (3.000 e-mails/mês)."),
 ("Taxa do cartão (%)", 0.0299, '0.00%', "Asaas, cartão à vista (padrão). Confirme no seu contrato."),
 ("Taxa fixa do cartão (R$)", 0.49, BRL, "Asaas, por cobrança no cartão."),
 ("Custo de cobrança por Pix (R$)", 2.15, BRL, "Asaas, por cobrança Pix (usei a tarifa maior da tabela, por prudência)."),
 ("Parcela que paga por cartão (%)", 0.5, PCT, "HIPÓTESE. O resto paga por Pix."),
 ("Imposto sobre a receita (%)", 0.06, PCT, "HIPÓTESE de Simples Nacional. CONFIRMAR com o contador (L-02)."),
 ("Custo da Meta por lembrete enviado (R$)", 0.10, BRL, "HIPÓTESE. A Meta cobra por mensagem de modelo entregue; a tabela em BRL não foi lida. Confirmar. Respostas dentro da janela de 24h (ex.: oferta de extra após o 'Confirmo') não costumam ter cobrança de modelo."),
 ("Lembretes por conta/mês: Solo", 0, INT, "Solo não tem automação de WhatsApp."),
 ("Lembretes por conta/mês: Pro", 60, INT, "HIPÓTESE (cerca de 60 atendimentos/mês)."),
 ("Lembretes por conta/mês: Studio", 200, INT, "HIPÓTESE (equipe de até 10)."),
 ("Mix de contas: Solo", 0.40, PCT, "HIPÓTESE."),
 ("Mix de contas: Pro", 0.45, PCT, "HIPÓTESE."),
 ("Mix de contas: Studio", 0.15, PCT, "HIPÓTESE."),
 ("Custos fixos em R$ (equipe de suporte, ferramentas, pró-labore)", 1500, BRL, "HIPÓTESE. Some o que for gastar por mês além da infraestrutura."),
]
for i, (a, v, f, s) in enumerate(P, 2):
    p.cell(i, 1, a); c = p.cell(i, 2, v); c.font = inp; c.number_format = f; p.cell(i, 3, s).alignment = Alignment(wrap_text=True, vertical="top")
p.column_dimensions["A"].width = 52; p.column_dimensions["B"].width = 14; p.column_dimensions["C"].width = 100
# nomes de células
R = {k: f"Premissas!$B${i}" for i, k in enumerate(["cambio","vercel","neon","outros","taxa","fixa","pix","pctcartao","imposto","meta","l_solo","l_pro","l_studio","m_solo","m_pro","m_studio","fixos"], 2)}

# ---------- Preços
pr = wb.create_sheet("Preços"); head(pr, 1, ["Plano", "A: conservador (R$/mês)", "B: intermediário (R$/mês)", "C: ambicioso (R$/mês)", "Observação"])
planos = [("Solo", 29, 39, 49, "Sem lembrete automático. Entrada."), ("Pro", 49, 69, 89, "Cenários iguais aos 49/69/89 do teste V-08."), ("Studio", 99, 139, 179, "Equipe de até 10.")]
for i, (n, a, b, c, o) in enumerate(planos, 2):
    pr.cell(i, 1, n)
    for j, v in enumerate((a, b, c), 2): x = pr.cell(i, j, v); x.font = inp; x.number_format = BRL
    pr.cell(i, 5, o)
pr.cell(6, 1, "Business: sob consulta. A gestão de várias unidades ainda não existe na interface, então não há preço."); pr.cell(7, 1, "Plano anual (sugestão, não existe): 10 meses pelo preço de 12, pago à vista.")
for col, wd in zip("ABCDE", (14, 24, 26, 22, 60)): pr.column_dimensions[col].width = wd

# ---------- Margem
m = wb.create_sheet("Margem"); head(m, 1, ["Cenário", "Plano", "Preço", "Taxa de pagamento", "Imposto", "Meta (lembretes)", "Custo variável", "Margem de contribuição (R$)", "Margem (%)"])
r = 2; linhas_m = {}
for ci, cen in enumerate(["A", "B", "C"]):
    col = "BCD"[ci]
    for pi, (n, *_ ) in enumerate(planos):
        prow = pi + 2; lem = [R["l_solo"], R["l_pro"], R["l_studio"]][pi]
        m.cell(r, 1, cen); m.cell(r, 2, n)
        m.cell(r, 3, f"='Preços'!{col}{prow}").number_format = BRL
        m.cell(r, 4, f"={R['pctcartao']}*(C{r}*{R['taxa']}+{R['fixa']})+(1-{R['pctcartao']})*{R['pix']}").number_format = BRL
        m.cell(r, 5, f"=C{r}*{R['imposto']}").number_format = BRL
        m.cell(r, 6, f"={lem}*{R['meta']}").number_format = BRL
        m.cell(r, 7, f"=D{r}+E{r}+F{r}").number_format = BRL
        m.cell(r, 8, f"=C{r}-G{r}").number_format = BRL
        m.cell(r, 9, f"=IF(C{r}=0,0,H{r}/C{r})").number_format = PCT
        linhas_m[(cen, n)] = r; r += 1
for col, wd in zip("ABCDEFGHI", (10, 10, 12, 18, 12, 16, 16, 26, 12)): m.column_dimensions[col].width = wd

# ---------- Equilíbrio
e = wb.create_sheet("Equilíbrio"); head(e, 1, ["Item", "A", "B", "C"])
e.cell(2, 1, "Custo fixo mensal em R$ (infraestrutura + outros + fixos da premissa)")
for j, col in enumerate("BCD", 2):
    e.cell(2, j, f"=({R['vercel']}+{R['neon']})*{R['cambio']}+{R['outros']}+{R['fixos']}").number_format = BRL
e.cell(3, 1, "Margem de contribuição média por conta (pelo mix)")
for j, cen in zip("BCD", "ABC"):
    e[f"{j}3"] = f"={R['m_solo']}*Margem!H{linhas_m[(cen,'Solo')]}+{R['m_pro']}*Margem!H{linhas_m[(cen,'Pro')]}+{R['m_studio']}*Margem!H{linhas_m[(cen,'Studio')]}"; e[f"{j}3"].number_format = BRL
e.cell(4, 1, "Contas pagantes para cobrir o custo fixo (ponto de equilíbrio)")
for j in "BCD": e[f"{j}4"] = f"=IF({j}3<=0,\"–\",ROUNDUP({j}2/{j}3,0))"; e[f"{j}4"].number_format = INT
e.cell(5, 1, "Receita média por conta (pelo mix)")
for j, cen in zip("BCD", "ABC"):
    e[f"{j}5"] = f"={R['m_solo']}*Margem!C{linhas_m[(cen,'Solo')]}+{R['m_pro']}*Margem!C{linhas_m[(cen,'Pro')]}+{R['m_studio']}*Margem!C{linhas_m[(cen,'Studio')]}"; e[f"{j}5"].number_format = BRL
e.cell(6, 1, "Receita mensal no ponto de equilíbrio")
for j in "BCD": e[f"{j}6"] = f"=IF(ISNUMBER({j}4),{j}4*{j}5,\"–\")"; e[f"{j}6"].number_format = BRL
e.cell(8, 1, "Lucro mensal com N contas pagantes (mude N na célula azul):"); n = e.cell(8, 2, 100); n.font = inp
e.cell(9, 1, "Lucro mensal (antes de marketing e comissões)")
for j in "BCD": e[f"{j}9"] = f"=$B$8*{j}3-{j}2"; e[f"{j}9"].number_format = BRL
e.column_dimensions["A"].width = 72
for j in "BCD": e.column_dimensions[j].width = 18

# ---------- Indicação
i_ = wb.create_sheet("Indicação"); head(i_, 1, ["Premissa / resultado", "Valor", "Observação"])
I = [
 ("Comissão da embaixadora sobre a mensalidade da indicada (%)", 0.20, PCT, "PROPOSTA. Decisão do dono."),
 ("Meses de comissão por indicada", 6, INT, "PROPOSTA. Só começa depois do 1º pagamento da indicada."),
 ("Desconto para a indicada no 1º mês (%)", 0.20, PCT, "PROPOSTA. Não existe como oferta hoje."),
 ("Plano da indicada para a conta (A, B ou C → linha Pro)", "B", None, "Use A, B ou C: escolhe o cenário de preço do Pro."),
]
for k, (a, v, f, o) in enumerate(I, 2):
    i_.cell(k, 1, a); c = i_.cell(k, 2, v); c.font = inp
    if f: c.number_format = f
    i_.cell(k, 3, o)
i_.cell(7, 1, "Preço do Pro no cenário escolhido")
i_["B7"] = f"=IF(B5=\"A\",'Preços'!B3,IF(B5=\"B\",'Preços'!C3,'Preços'!D3))"; i_["B7"].number_format = BRL
i_.cell(8, 1, "Margem de contribuição do Pro (cenário escolhido)")
i_["B8"] = f"=IF(B5=\"A\",Margem!H{linhas_m[('A','Pro')]},IF(B5=\"B\",Margem!H{linhas_m[('B','Pro')]},Margem!H{linhas_m[('C','Pro')]}))"; i_["B8"].number_format = BRL
i_.cell(9, 1, "Comissão total paga por indicada (R$)"); i_["B9"] = "=B7*B2*B3"; i_["B9"].number_format = BRL
i_.cell(10, 1, "Desconto dado à indicada (R$)"); i_["B10"] = "=B7*B4"; i_["B10"].number_format = BRL
i_.cell(11, 1, "Custo de aquisição pela indicação (comissão + desconto)"); i_["B11"] = "=B9+B10"; i_["B11"].number_format = BRL
i_.cell(12, 1, "Margem de contribuição da indicada nos meses da comissão"); i_["B12"] = "=B8*B3-B10"; i_["B12"].number_format = BRL
i_.cell(13, 1, "Sobra nos meses da comissão depois de pagar a embaixadora"); i_["B13"] = "=B12-B9"; i_["B13"].number_format = BRL
i_.cell(14, 1, "Meses para a indicada se pagar (payback do CAC)"); i_["B14"] = "=IF(B8<=0,\"–\",ROUNDUP(B11/B8,0))"; i_["B14"].number_format = INT
i_.cell(15, 1, "Valor de 12 meses da indicada que fica com a Gê (margem menos comissão e desconto)"); i_["B15"] = "=B8*12-B11"; i_["B15"].number_format = BRL
i_.column_dimensions["A"].width = 76; i_.column_dimensions["B"].width = 16; i_.column_dimensions["C"].width = 60

wb.save("../PLANILHA-PRECIFICACAO.xlsx"); print("ok")
