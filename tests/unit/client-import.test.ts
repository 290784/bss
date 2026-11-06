import { describe, expect, it } from "vitest";
import { dedupeInFile, IMPORT_MAX_ROWS, ImportFileError, mapColumns, parseBirthDate, parseClientImport, parseCsv } from "@/domain/client-import";

describe("parseCsv", () => {
  it("entende ponto e vírgula, vírgula e tabulação sem configurar", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a\tb\tc\n1\t2\t3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("aspas: separador dentro do campo, aspas duplas escapadas e quebra de linha dentro do campo", () => {
    expect(parseCsv('nome;obs\n"Ana; Maria";"disse ""oi"""\n"Bia";"linha1\nlinha2"')).toEqual([
      ["nome", "obs"], ["Ana; Maria", 'disse "oi"'], ["Bia", "linha1\nlinha2"],
    ]);
  });
  it("arquivo do Excel: BOM, CRLF, linhas vazias e sem quebra no fim", () => {
    expect(parseCsv("﻿nome;tel\r\nAna;1\r\n\r\n;;\r\nBia;2")).toEqual([["nome", "tel"], ["Ana", "1"], ["Bia", "2"]]);
  });
  it("campo vazio no meio e no fim é preservado", () => {
    expect(parseCsv("a;b;c\n1;;")).toEqual([["a", "b", "c"], ["1", "", ""]]);
  });
});

describe("mapColumns", () => {
  it("reconhece cabeçalhos comuns, com acento, caixa e variações", () => {
    expect(mapColumns(["Nome Completo", "Celular", "E-mail", "Data de Nascimento", "Observações"])).toEqual({ fullName: 0, phone: 1, email: 2, birthDate: 3, preferences: 4 });
    expect(mapColumns(["Cliente", "WhatsApp", "email", "Aniversário", "Obs"])).toEqual({ fullName: 0, phone: 1, email: 2, birthDate: 3, preferences: 4 });
    expect(mapColumns(["nome", "sobrenome"])).toEqual({ fullName: 0, lastName: 1 });
  });
  it("coluna desconhecida é ignorada", () => {
    expect(mapColumns(["id", "nome", "cpf"])).toEqual({ fullName: 1 });
  });
});

describe("parseBirthDate", () => {
  it("aceita os formatos brasileiros e o ISO", () => {
    expect(parseBirthDate("15/03/1990")).toBe("1990-03-15");
    expect(parseBirthDate("5-3-1990")).toBe("1990-03-05");
    expect(parseBirthDate("15.03.1990")).toBe("1990-03-15");
    expect(parseBirthDate("1990-03-15")).toBe("1990-03-15");
    expect(parseBirthDate(" 29/02/2000 ")).toBe("2000-02-29");
  });
  it("recusa data impossível, ano fora do razoável e formato ambíguo", () => {
    expect(parseBirthDate("31/02/1990")).toBeNull();
    expect(parseBirthDate("29/02/2001")).toBeNull();
    expect(parseBirthDate("15/13/1990")).toBeNull();
    expect(parseBirthDate("15/03/1850")).toBeNull();
    expect(parseBirthDate("15/03/2099", new Date("2026-11-05"))).toBeNull();
    expect(parseBirthDate("15/03/90")).toBeNull();
    expect(parseBirthDate("15/03")).toBeNull();
    expect(parseBirthDate("ontem")).toBeNull();
  });
});

describe("parseClientImport", () => {
  const csv = (...lines: string[]) => lines.join("\n");

  it("caminho feliz: normaliza telefone, e-mail em minúsculas e data; linhas contam a partir do cabeçalho", () => {
    const r = parseClientImport(csv("nome;telefone;email;nascimento;observacoes", "Maria Souza;(11) 98888-0001;MARIA@Exemplo.COM;15/03/1990;Prefere manhã"));
    expect(r.errors).toEqual([]); expect(r.warnings).toEqual([]);
    expect(r.rows).toEqual([{ line: 2, fullName: "Maria Souza", phone: "(11) 98888-0001", phoneNormalized: "5511988880001", email: "maria@exemplo.com", birthDate: "1990-03-15", preferences: "Prefere manhã" }]);
    expect(r.totalLines).toBe(1);
  });
  it("só o nome é obrigatório", () => {
    const r = parseClientImport(csv("nome", "Ana Lima"));
    expect(r.rows[0]).toMatchObject({ fullName: "Ana Lima", phone: null, email: null, birthDate: null, preferences: null });
  });
  it("nome e sobrenome em colunas separadas viram um nome completo", () => {
    expect(parseClientImport(csv("nome;sobrenome", "Ana;Lima")).rows[0]!.fullName).toBe("Ana Lima");
  });
  it("sem nome ou nome curto: linha descartada com o número da linha; as outras seguem", () => {
    const r = parseClientImport(csv("nome;telefone", ";11999990000", "A;11999990001", "Beatriz;11999990002"));
    expect(r.errors).toEqual([{ line: 2, message: "Sem nome." }, { line: 3, message: "Nome curto demais (mínimo 2 letras)." }]);
    expect(r.rows.map((x) => x.fullName)).toEqual(["Beatriz"]);
  });
  it("telefone, e-mail ou nascimento inválidos: a cliente entra sem o campo e vira aviso (não se perde a cliente)", () => {
    const r = parseClientImport(csv("nome;telefone;email;nascimento", "Carla Dias;12345;carla@;31/02/1990"));
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ fullName: "Carla Dias", phone: null, email: null, birthDate: null });
    expect(r.warnings.map((w) => w.line)).toEqual([2, 2, 2]);
    expect(r.warnings.map((w) => w.message).join(" ")).toMatch(/Telefone.*E-mail.*Nascimento/);
  });
  it("várias linhas de telefone na mesma célula: vale o primeiro número válido", () => {
    expect(parseClientImport(csv("nome;telefone", "Dani Rocha;99 / 11 98888-1111 / 11 97777-2222")).rows[0]!.phoneNormalized).toBe("5511988881111");
  });
  it("limpa caracteres de controle e espaços repetidos; observação é cortada em 1000", () => {
    const r = parseClientImport(csv(`nome;observacoes`, `"Eva\u0000   Lopes";"${"x".repeat(1500)}"`));
    expect(r.rows[0]!.fullName).toBe("Eva Lopes");
    expect(r.rows[0]!.preferences).toHaveLength(1000);
  });
  it("fórmulas de planilha entram como texto puro (o app nunca as executa)", () => {
    expect(parseClientImport(csv("nome", "=HYPERLINK(\"http://x\")")).rows[0]!.fullName).toContain("HYPERLINK");
  });
  it("arquivo sem cabeçalho de nome, vazio, só cabeçalho ou grande demais: erro claro", () => {
    expect(() => parseClientImport("telefone;email\n11999990000;a@b.com")).toThrow(/coluna do nome/);
    expect(() => parseClientImport("")).toThrow(ImportFileError);
    expect(() => parseClientImport("nome")).toThrow(/Não achei clientes/);
    const many = ["nome", ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `Cliente ${i}`)].join("\n");
    expect(() => parseClientImport(many)).toThrow(/limite/);
    expect(() => parseClientImport("nome\n" + "x".repeat(1_000_001))).toThrow(/grande demais/);
  });
});

describe("dedupeInFile", () => {
  const row = (line: number, fullName: string, phoneNormalized: string | null = null, email: string | null = null) => ({ line, fullName, phone: phoneNormalized, phoneNormalized, email, birthDate: null, preferences: null });
  it("repetida por telefone ou e-mail: vale a primeira, e diz de qual linha", () => {
    const r = dedupeInFile([row(2, "Ana", "5511999990000"), row(3, "Ana L.", "5511999990000"), row(4, "Bia", null, "b@x.com"), row(5, "Bia M", null, "b@x.com")]);
    expect(r.unique.map((x) => x.line)).toEqual([2, 4]);
    expect(r.duplicates).toEqual([{ line: 3, of: 2, reason: "mesmo telefone" }, { line: 5, of: 4, reason: "mesmo e-mail" }]);
  });
  it("mesmo nome com telefones diferentes são pessoas diferentes; sem telefone nem e-mail, o nome identifica", () => {
    const r = dedupeInFile([row(2, "Maria Silva", "5511911111111"), row(3, "Maria Silva", "5511922222222"), row(4, "Joana"), row(5, "joana"), row(6, "João")]);
    expect(r.unique.map((x) => x.line)).toEqual([2, 3, 4, 6]);
    expect(r.duplicates).toEqual([{ line: 5, of: 4, reason: "mesmo nome" }]);
  });
});
