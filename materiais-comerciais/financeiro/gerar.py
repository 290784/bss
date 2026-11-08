"""Gera PLANILHA-FINANCEIRA.xlsx (MRR, CAC, LTV, caixa e fôlego). Uso: python3 gerar.py [--exemplo]
Sem --exemplo a planilha sai com as células azuis em branco (preço ainda não definido, tarefa C-01).
Com --exemplo (só para testar as fórmulas) preenche números inventados e grava em exemplo-teste.xlsx."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L

EXEMPLO = "--exemplo" in sys.argv
wb = Workbook()
AZUL = Font(color="1F4FBF", bold=True); NEG = Font(bold=True); CAB = Font(bold=True, color="FFFFFF")
FUNDO_CAB = PatternFill("solid", fgColor="642350"); FUNDO_IN = PatternFill("solid", fgColor="EAF0FF"); FUNDO_RES = PatternFill("solid", fgColor="F6F3EE")
fino = Side(style="thin", color="D9D2CA"); BORDA = Border(top=fino, bottom=fino, left=fino, right=fino)
BRL = '"R$" #,##0.00'; PCT = "0.0%"; NUM = "0"

# ---------------- Leia-me ----------------
ws = wb.active; ws.title = "Leia-me"
linhas = [
 ("Planilha financeira da Gê", NEG),
 ("Para acompanhar MRR, custo de aquisição (CAC), retenção, caixa e fôlego, mês a mês.", None),
 ("", None),
 ("Como preencher", NEG),
 ("1. Aba Premissas: preencha as células azuis. O preço mensal só existe depois da tarefa C-01 (teste de preço); enquanto estiver em branco, as contas ficam com “–”.", None),
 ("2. Aba Mensal: no fim de cada mês, preencha só as células azuis (gasto com marketing, cadastros, novas pagantes e canceladas). O resto é fórmula.", None),
 ("3. De onde tirar os números: cadastros e ativação vêm do Painel do fundador (/admin/painel); gasto vem do extrato; pagantes vêm do provedor de cobrança (depois da P-09).", None),
 ("", None),
 ("Como ler", NEG),
 ("MRR: receita mensal recorrente (pagantes × preço). CAC: gasto com marketing ÷ novas pagantes. Churn: canceladas ÷ pagantes do início do mês.", None),
 ("LTV: quanto uma conta paga ao longo da vida (margem por conta ÷ churn). LTV/CAC acima de 3 e payback abaixo de 12 meses costumam indicar um negócio saudável.", None),
 ("Fôlego: quantos meses o caixa aguenta se o resultado do mês se repetir.", None),
 ("Meses que você ainda não preencheu mostram o que acontece se nada mudar (mesmas pagantes, mesmos custos fixos). Use só como projeção; os números reais são os dos meses preenchidos.", None),
 ("", None),
 ("Cores: azul = você preenche; preto = fórmula (não mexer). Impostos, pró-labore e taxas fiscais NÃO estão aqui: falar com a contabilidade antes de decidir qualquer coisa fiscal.", None),
]
for i, (t, f) in enumerate(linhas, 1):
    c = ws.cell(i, 1, t); c.alignment = Alignment(wrap_text=True, vertical="top")
    if f: c.font = f
ws["A1"].font = Font(bold=True, size=16, color="642350"); ws.column_dimensions["A"].width = 120

# ---------------- Premissas ----------------
p = wb.create_sheet("Premissas")
p["A1"] = "Premissas (células azuis)"; p["A1"].font = Font(bold=True, size=14, color="642350")
itens = [
 ("Preço mensal por conta (R$)", 79.0 if EXEMPLO else None, BRL, "Definir na C-01 (teste de preço)."),
 ("Taxa do provedor de cobrança (% da receita)", 0.0299 if EXEMPLO else None, PCT, "Depende da escolha na F-01."),
 ("Custo fixo mensal com ferramentas (R$)", 250.0 if EXEMPLO else None, BRL, "Hospedagem, banco, e-mail, domínio…"),
 ("Custo variável por conta pagante (R$/mês)", 6.0 if EXEMPLO else None, BRL, "Mensagens de WhatsApp, armazenamento…"),
 ("Caixa inicial (R$)", 5000.0 if EXEMPLO else None, BRL, "Quanto há disponível no começo do mês 1."),
 ("Orçamento de marketing aprovado, 90 dias (R$)", None, BRL, "Proposta de R$ 7.750 aguardando a F-03; só vale depois de aprovada."),
]
for i, (nome, v, fmt, nota) in enumerate(itens, 3):
    p.cell(i, 1, nome); c = p.cell(i, 2, v); c.number_format = fmt; c.font = AZUL; c.fill = FUNDO_IN; c.border = BORDA; p.cell(i, 3, nota).font = Font(italic=True, color="6B5A64")
p.column_dimensions["A"].width = 48; p.column_dimensions["B"].width = 18; p.column_dimensions["C"].width = 70
PRECO, TAXA, FIXO, VAR, CAIXA0 = "Premissas!$B$3", "Premissas!$B$4", "Premissas!$B$5", "Premissas!$B$6", "Premissas!$B$7"

# ---------------- Mensal ----------------
m = wb.create_sheet("Mensal")
cols = ["Mês", "Gasto com marketing (R$)", "Cadastros no mês", "Novas pagantes", "Canceladas",
        "Pagantes no início", "Pagantes no fim", "MRR (R$)", "Receita líquida (R$)", "Custos totais (R$)", "Resultado do mês (R$)",
        "Caixa no fim (R$)", "Churn do mês", "Cadastro → pagante", "CAC (R$)", "LTV (R$)", "LTV / CAC", "Payback (meses)", "Fôlego (meses)"]
for j, t in enumerate(cols, 1):
    c = m.cell(1, j, t); c.font = CAB; c.fill = FUNDO_CAB; c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center"); m.column_dimensions[L(j)].width = 15
m.row_dimensions[1].height = 42; m.column_dimensions["A"].width = 10; m.freeze_panes = "B2"
ex = {2: (800, 60, 8, 0), 3: (800, 70, 10, 1), 4: (800, 80, 12, 2)} if EXEMPLO else {}
for r in range(2, 14):
    mes = r - 1
    m.cell(r, 1, f"Mês {mes}").font = NEG
    for j, k in zip((2, 3, 4, 5), range(4)):
        c = m.cell(r, j, ex[r][k] if r in ex else None); c.font = AZUL; c.fill = FUNDO_IN; c.border = BORDA
    m.cell(r, 2).number_format = BRL
    m.cell(r, 6, 0 if r == 2 else f"=G{r-1}")
    m.cell(r, 7, f"=MAX(0,F{r}+N(D{r})-N(E{r}))")
    m.cell(r, 8, f'=IF({PRECO}="","",G{r}*{PRECO})').number_format = BRL
    m.cell(r, 9, f'=IF(H{r}="","",H{r}*(1-N({TAXA})))').number_format = BRL
    m.cell(r, 10, f'=IF({FIXO}="","",N({FIXO})+N({VAR})*G{r}+N(B{r}))').number_format = BRL
    m.cell(r, 11, f'=IF(OR(I{r}="",J{r}=""),"",I{r}-J{r})').number_format = BRL
    anterior = CAIXA0 if r == 2 else f"L{r-1}"
    m.cell(r, 12, f'=IF(K{r}="","",N({anterior})+K{r})').number_format = BRL
    m.cell(r, 13, f'=IF(F{r}=0,"",N(E{r})/F{r})').number_format = PCT
    m.cell(r, 14, f'=IF(N(C{r})=0,"",N(D{r})/C{r})').number_format = PCT
    m.cell(r, 15, f'=IF(N(D{r})=0,"",N(B{r})/D{r})').number_format = BRL
    m.cell(r, 16, f'=IF(OR({PRECO}="",M{r}="",M{r}=0),"",{PRECO}*(1-N({TAXA}))/M{r})').number_format = BRL
    m.cell(r, 17, f'=IF(OR(O{r}="",P{r}="",O{r}=0),"",P{r}/O{r})').number_format = "0.0"
    m.cell(r, 18, f'=IF(OR(O{r}="",{PRECO}=""),"",O{r}/({PRECO}*(1-N({TAXA}))))').number_format = "0.0"
    m.cell(r, 19, f'=IF(OR(K{r}="",L{r}="",K{r}>=0),"",L{r}/-K{r})').number_format = "0.0"
    for j in range(6, 20): m.cell(r, j).border = BORDA; m.cell(r, j).fill = FUNDO_RES
    m.cell(r, 6).number_format = NUM; m.cell(r, 7).number_format = NUM
r = 14
m.cell(r, 1, "Total").font = NEG
for j, f in ((2, "SUM"), (3, "SUM"), (4, "SUM"), (5, "SUM")): m.cell(r, j, f"={f}({L(j)}2:{L(j)}13)").font = NEG
m.cell(r, 2).number_format = BRL
m.cell(r, 15, '=IF(N(D14)=0,"",N(B14)/D14)').number_format = BRL; m.cell(r, 15).font = NEG
m.cell(r, 14, '=IF(N(C14)=0,"",N(D14)/C14)').number_format = PCT; m.cell(r, 14).font = NEG
wb.save("exemplo-teste.xlsx" if EXEMPLO else "../PLANILHA-FINANCEIRA.xlsx")
