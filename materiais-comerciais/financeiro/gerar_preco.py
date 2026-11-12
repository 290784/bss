"""Gera PLANILHA-TESTE-DE-PRECO.xlsx: análise de Van Westendorp + ofertas de R$ 49, 69 e 89. Uso: python3 gerar_preco.py [--exemplo]
Sem --exemplo a planilha sai vazia (para as respostas reais). Com --exemplo grava exemplo-preco-teste.xlsx com 12 respostas inventadas, só para validar as fórmulas."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
EXEMPLO = "--exemplo" in sys.argv
wb = Workbook()
AZUL = Font(color="1F4FBF", bold=True); NEG = Font(bold=True); CAB = Font(bold=True, color="FFFFFF")
FUNDO_CAB = PatternFill("solid", fgColor="642350"); FUNDO_IN = PatternFill("solid", fgColor="EAF0FF"); FUNDO_RES = PatternFill("solid", fgColor="F6F3EE")
fino = Side(style="thin", color="D9D2CA"); BORDA = Border(top=fino, bottom=fino, left=fino, right=fino)
BRL = '"R$" #,##0'; PCT = "0%"
N_LINHAS = 200

# ---------- Leia-me ----------
ws = wb.active; ws.title = "Leia-me"
txt = [
 ("Teste de preço da Gê (V-08)", NEG),
 ("Serve para achar a faixa de preço mensal que as profissionais aceitam, a partir de 4 perguntas feitas depois da demonstração (método Van Westendorp), e ver como as ofertas de R$ 49, R$ 69 e R$ 89 se saem.", None),
 ("", None),
 ("Como usar", NEG),
 ("1. Depois de cada demonstração, na aba Respostas, uma linha por pessoa: coloque os 4 valores (em reais, por mês) nas células azuis. Só números, sem R$.", None),
 ("2. A aba Resultado calcula sozinha a faixa de preço e o preço ideal, e mostra a tabela das ofertas. Precisa de pelo menos 10 respostas para fazer sentido (o ideal são 20 ou mais).", None),
 ("3. Anote, na coluna Observação, o que a pessoa disse. Os números ajudam, mas a conversa explica.", None),
 ("", None),
 ("As 4 perguntas (nesta ordem, como no ROTEIRO-ENTREVISTAS.md)", NEG),
 ("A. A que preço mensal você acharia TÃO BARATO que desconfiaria da qualidade?", None),
 ("B. A que preço mensal você acharia BARATO, uma boa compra?", None),
 ("C. A que preço mensal você acharia CARO, mas ainda consideraria?", None),
 ("D. A que preço mensal você acharia CARO DEMAIS e não compraria?", None),
 ("", None),
 ("Como ler o Resultado", NEG),
 ("Faixa aceitável: do ponto de preço marginal barato (PMB) ao ponto de preço marginal caro (PMC). Abaixo do PMB, o preço desconfia; acima do PMC, afasta.", None),
 ("Preço ideal (OPP): onde menos gente acha o preço barato demais ou caro demais. Preço de indiferença (IPP): onde o mesmo tanto acha barato e caro.", None),
 ("Com poucas respostas, o preço ideal (OPP) pode cair no começo de uma faixa em que quase ninguém rejeita: olhe junto a faixa aceitável e a tabela das ofertas.", None),
 ("Ofertas: para cada preço (R$ 49, 69, 89), mostra quantas pessoas acham caro demais (D) e quantas desconfiariam por ser barato (A). Quanto menor a soma das duas, mais seguro o preço.", None),
 ("", None),
 ("Cuidados", NEG),
 ("Amostra pequena engana: com menos de 20 respostas trate o resultado como pista, não como verdade. Quem respondeu depois de uma demonstração boa tende a aceitar preço maior que a média das profissionais.", None),
 ("Preço de lançamento para as beta (preço de fundadora) é decisão sua e não precisa ser igual ao da tabela (C-01 e C-02).", None),
]
for i, (t, f) in enumerate(txt, 1):
    c = ws.cell(i, 1, t); c.alignment = Alignment(wrap_text=True, vertical="top")
    if f: c.font = f
ws["A1"].font = Font(bold=True, size=16, color="642350"); ws.column_dimensions["A"].width = 120

# ---------- Respostas ----------
r = wb.create_sheet("Respostas")
cab = ["Nº", "Data", "Atividade (lash, nail…)", "A. Tão barato (R$/mês)", "B. Barato (R$/mês)", "C. Caro (R$/mês)", "D. Caro demais (R$/mês)", "Observação"]
for j, t in enumerate(cab, 1):
    c = r.cell(1, j, t); c.font = CAB; c.fill = FUNDO_CAB; c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
r.row_dimensions[1].height = 36; r.freeze_panes = "A2"
for col, w in zip("ABCDEFGH", (6, 12, 22, 16, 16, 16, 18, 50)): r.column_dimensions[col].width = w
ex = [(19, 39, 59, 89), (29, 49, 69, 99), (15, 35, 55, 79), (25, 45, 79, 129), (20, 40, 60, 90), (30, 50, 70, 100),
      (10, 29, 49, 69), (35, 59, 89, 129), (25, 49, 69, 89), (20, 39, 69, 99), (29, 55, 79, 109), (15, 30, 50, 70)] if EXEMPLO else []
for i in range(2, N_LINHAS + 2):
    r.cell(i, 1, i - 1)
    for j in range(2, 9):
        c = r.cell(i, j); c.fill = FUNDO_IN; c.border = BORDA; c.font = AZUL
    if EXEMPLO and i - 2 < len(ex):
        for j, v in enumerate(ex[i - 2], 4): r.cell(i, j, v)
        r.cell(i, 2, "2027-01-10"); r.cell(i, 3, "lash")
FIM = N_LINHAS + 1
col = {"A": f"Respostas!$D$2:$D${FIM}", "B": f"Respostas!$E$2:$E${FIM}", "C": f"Respostas!$F$2:$F${FIM}", "D": f"Respostas!$G$2:$G${FIM}"}

# ---------- Curvas (grade de preços de R$ 5 a R$ 250) ----------
cv = wb.create_sheet("Curvas")
for j, t in enumerate(["Preço (R$)", "Tão barato (A)", "Barato (B)", "Não é barato (1 - B)", "Caro (C)", "Não é caro (1 - C)", "Caro demais (D)"], 1):
    c = cv.cell(1, j, t); c.font = CAB; c.fill = FUNDO_CAB; c.alignment = Alignment(wrap_text=True, horizontal="center")
cv.freeze_panes = "A2"
for j in range(1, 8): cv.column_dimensions[chr(64 + j)].width = 17
N = "COUNT(" + col["A"] + ")"
GRADE = list(range(5, 255, 5))
for i, p in enumerate(GRADE, 2):
    cv.cell(i, 1, p).number_format = BRL
    cv.cell(i, 2, f'=IF({N}=0,"",COUNTIF({col["A"]},">="&A{i})/{N})')   # % cujo "tão barato" é >= preço (descendente)
    cv.cell(i, 3, f'=IF({N}=0,"",COUNTIF({col["B"]},">="&A{i})/{N})')   # % cujo "barato" é >= preço
    cv.cell(i, 4, f'=IF({N}=0,"",1-C{i})')
    cv.cell(i, 5, f'=IF({N}=0,"",COUNTIF({col["C"]},"<="&A{i})/{N})')   # % cujo "caro" é <= preço (ascendente)
    cv.cell(i, 6, f'=IF({N}=0,"",1-E{i})')
    cv.cell(i, 7, f'=IF({N}=0,"",COUNTIF({col["D"]},"<="&A{i})/{N})')   # % cujo "caro demais" é <= preço
    for j in range(2, 8): cv.cell(i, j).number_format = PCT
ULT = len(GRADE) + 1

# ---------- Resultado ----------
rs = wb.create_sheet("Resultado")
rs["A1"] = "Resultado do teste de preço"; rs["A1"].font = Font(bold=True, size=14, color="642350")
rs["A3"] = "Respostas completas"; rs["B3"] = f"=COUNT({col['A']})"
rs["C3"] = '=IF(B3<10,"Poucas respostas: precisa de pelo menos 10 (ideal 20+).","")'; rs["C3"].font = Font(italic=True, color="B00020")
def cruza(nome, linha, f_lado, nota):
    rs.cell(linha, 1, nome).font = NEG
    # primeiro preço da grade em que a curva ascendente alcança a descendente
    rs.cell(linha, 2, f'=IF($B$3<10,"",IFERROR(INDEX(Curvas!$A$2:$A${ULT},MATCH(TRUE,INDEX({f_lado},0),0)),"fora da grade"))').number_format = BRL
    rs.cell(linha, 3, nota).font = Font(italic=True, color="6B5A64")
cruza("PMB: preço marginal barato", 5, f"Curvas!$D$2:$D${ULT}>=Curvas!$B$2:$B${ULT}", "Abaixo disso, desconfiam por ser barato demais.")
cruza("PMC: preço marginal caro", 6, f"Curvas!$F$2:$F${ULT}<=Curvas!$G$2:$G${ULT}", "Acima disso, afasta (caro demais).")
cruza("IPP: preço de indiferença", 7, f"Curvas!$E$2:$E${ULT}>=Curvas!$C$2:$C${ULT}", "Tanta gente acha barato quanto caro.")
cruza("OPP: preço ideal", 8, f"Curvas!$G$2:$G${ULT}>=Curvas!$B$2:$B${ULT}", "Onde menos gente rejeita (nem barato nem caro demais).")
rs["A10"] = "Faixa aceitável"; rs["A10"].font = NEG
rs["B10"] = '=IF(OR(B5="",B6=""),"",TEXT(B5,"\\R\\$ 0")&" a "&TEXT(B6,"\\R\\$ 0"))'
rs["A12"] = "Ofertas testadas"; rs["A12"].font = NEG
for j, t in enumerate(["Preço", "Acham caro demais (D)", "Desconfiam, tão barato (A)", "Rejeição total", "Aceitam (1 - rejeição)"], 1):
    c = rs.cell(13, j, t); c.font = CAB; c.fill = FUNDO_CAB; c.alignment = Alignment(wrap_text=True, horizontal="center")
for i, p in enumerate((49, 69, 89), 14):
    c = rs.cell(i, 1, p); c.font = AZUL; c.fill = FUNDO_IN; c.number_format = BRL
    rs.cell(i, 2, f'=IF($B$3=0,"",COUNTIF({col["D"]},"<="&A{i})/$B$3)').number_format = PCT
    rs.cell(i, 3, f'=IF($B$3=0,"",COUNTIF({col["A"]},">="&A{i})/$B$3)').number_format = PCT
    rs.cell(i, 4, f'=IF($B$3=0,"",B{i}+C{i})').number_format = PCT
    rs.cell(i, 5, f'=IF($B$3=0,"",1-D{i})').number_format = PCT
rs["A18"] = "Para trocar os preços testados, mude as 3 células azuis da coluna A (linhas 14 a 16)."; rs["A18"].font = Font(italic=True, color="6B5A64")
rs.column_dimensions["A"].width = 30
for c_ in "BCDE": rs.column_dimensions[c_].width = 26
wb.move_sheet("Resultado", offset=-2)
wb.save("exemplo-preco-teste.xlsx" if EXEMPLO else "../PLANILHA-TESTE-DE-PRECO.xlsx")
