import { z } from "zod";
import { normalizePhone } from "@/lib/text";

/**
 * Importação de clientes por planilha (CSV). Parte pura: lê o arquivo, entende as colunas, valida cada linha e separa
 * repetidas dentro do arquivo. O banco (clientes que já existem) entra em src/server/modules/client-import.ts.
 *
 * Regras:
 * - só o nome é obrigatório; telefone, e-mail ou nascimento inválidos não derrubam a linha: a cliente entra sem esse
 *   campo e a linha aparece como aviso (melhor ter a cliente sem o dado do que perder a cliente);
 * - aceita ";" "," ou tabulação como separador, aspas e quebras de linha dentro de aspas, e arquivo do Excel com BOM;
 * - quem entra por importação nunca vem com consentimento de marketing (LGPD): isso é tratado no módulo do servidor.
 */

export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_MAX_CHARS = 1_000_000;

export class ImportFileError extends Error {
  constructor(message: string) { super(message); this.name = "ImportFileError"; }
}

export type ImportRow = {
  line: number;
  fullName: string;
  phone: string | null;            // como veio na planilha (primeiro número válido)
  phoneNormalized: string | null;  // só dígitos com 55
  email: string | null;
  birthDate: string | null;        // AAAA-MM-DD
  preferences: string | null;
};
export type ImportIssue = { line: number; message: string };
export type ParsedImport = { rows: ImportRow[]; errors: ImportIssue[]; warnings: ImportIssue[]; totalLines: number };

function detectDelimiter(text: string): string {
  const first = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  const counts: [string, number][] = [[";", 0], [",", 0], ["\t", 0]];
  let quoted = false;
  for (const c of first) {
    if (c === '"') quoted = !quoted;
    else if (!quoted) for (const e of counts) if (c === e[0]) e[1]++;
  }
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ";";
}

/** CSV simples e tolerante (RFC 4180 + separador automático). Linhas totalmente vazias são descartadas. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"' && field.trim() === "") { quoted = true; field = ""; }
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

type Field = "fullName" | "lastName" | "phone" | "email" | "birthDate" | "preferences";
const ALIASES: Record<Field, string[]> = {
  fullName: ["nome", "nome completo", "cliente", "nome da cliente", "nome do cliente", "name", "full name"],
  lastName: ["sobrenome", "ultimo nome", "last name"],
  phone: ["telefone", "celular", "whatsapp", "fone", "tel", "phone", "telefone celular", "telefone 1", "contato"],
  email: ["email", "e mail", "correio eletronico"],
  birthDate: ["nascimento", "data de nascimento", "data nascimento", "dt nascimento", "aniversario", "birth date", "birthday"],
  preferences: ["observacoes", "observacao", "obs", "anotacoes", "preferencias", "notas", "observacoes gerais"],
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

/** Descobre qual coluna é qual pelo nome do cabeçalho (sem acento, sem diferença de caixa). */
export function mapColumns(header: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  header.forEach((h, i) => {
    const name = plain(h);
    for (const f of Object.keys(ALIASES) as Field[]) if (out[f] === undefined && ALIASES[f].includes(name)) out[f] = i;
  });
  return out;
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Aceita AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA e DD.MM.AAAA; data impossível (31/02) ou ano fora de 1900 até hoje vira null. */
export function parseBirthDate(raw: string, now = new Date()): string | null {
  const v = raw.trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (r) { y = +r[1]!; m = +r[2]!; d = +r[3]!; }
  else if ((r = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(v))) { d = +r[1]!; m = +r[2]!; y = +r[3]!; }
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  if (y < 1900 || y > now.getUTCFullYear()) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function firstPhone(raw: string): { phone: string; normalized: string } | null {
  for (const part of raw.split(/[/;,|]|\s{2,}| ou /i)) {
    const p = part.trim();
    const n = normalizePhone(p);
    if (n) return { phone: p.slice(0, 30), normalized: n };
  }
  return null;
}

/** Lê o arquivo inteiro: devolve as linhas boas, os erros (linha descartada) e os avisos (linha entra sem um campo). */
export function parseClientImport(text: string): ParsedImport {
  if (text.length > IMPORT_MAX_CHARS) throw new ImportFileError("O arquivo é grande demais. Divida em partes de até 5.000 clientes.");
  const table = parseCsv(text);
  if (table.length < 2) throw new ImportFileError("Não achei clientes no arquivo. A primeira linha precisa ser o cabeçalho (nome, telefone…) e as seguintes, as clientes.");
  const cols = mapColumns(table[0]!);
  if (cols.fullName === undefined) throw new ImportFileError("Não achei a coluna do nome. Use o cabeçalho “nome” na primeira linha (veja o modelo).");
  const body = table.slice(1);
  if (body.length > IMPORT_MAX_ROWS) throw new ImportFileError(`Tem ${body.length.toLocaleString("pt-BR")} linhas. O limite é ${IMPORT_MAX_ROWS.toLocaleString("pt-BR")} por arquivo: divida em partes.`);

  const rows: ImportRow[] = [], errors: ImportIssue[] = [], warnings: ImportIssue[] = [];
  const cell = (r: string[], f: Field) => (cols[f] === undefined ? "" : clean(r[cols[f]!] ?? ""));
  body.forEach((r, idx) => {
    const line = idx + 2; // linha do arquivo (1 = cabeçalho)
    const name = [cell(r, "fullName"), cell(r, "lastName")].filter(Boolean).join(" ");
    if (name.length < 2) { errors.push({ line, message: name ? "Nome curto demais (mínimo 2 letras)." : "Sem nome." }); return; }
    if (name.length > 120) { errors.push({ line, message: "Nome com mais de 120 letras." }); return; }

    let phone: string | null = null, phoneNormalized: string | null = null;
    const rawPhone = cell(r, "phone");
    if (rawPhone) {
      const p = firstPhone(rawPhone);
      if (p) { phone = p.phone; phoneNormalized = p.normalized; }
      else warnings.push({ line, message: `Telefone “${rawPhone.slice(0, 30)}” inválido: a cliente entrou sem telefone (use DDD + número).` });
    }
    let email: string | null = null;
    const rawEmail = cell(r, "email");
    if (rawEmail) {
      if (z.email().safeParse(rawEmail).success && rawEmail.length <= 160) email = rawEmail.toLowerCase();
      else warnings.push({ line, message: `E-mail “${rawEmail.slice(0, 40)}” inválido: a cliente entrou sem e-mail.` });
    }
    let birthDate: string | null = null;
    const rawBirth = cell(r, "birthDate");
    if (rawBirth) {
      birthDate = parseBirthDate(rawBirth);
      if (!birthDate) warnings.push({ line, message: `Nascimento “${rawBirth.slice(0, 20)}” não entendido: a cliente entrou sem data (use DD/MM/AAAA).` });
    }
    const preferences = cell(r, "preferences").slice(0, 1000) || null;
    rows.push({ line, fullName: name, phone, phoneNormalized, email, birthDate, preferences });
  });
  return { rows, errors, warnings, totalLines: body.length };
}

export type FileDuplicate = { line: number; of: number; reason: "mesmo telefone" | "mesmo e-mail" | "mesmo nome" };

/** Repetidas dentro do próprio arquivo: vale a primeira. Telefone e e-mail identificam; o nome só quando não há nenhum dos dois. */
export function dedupeInFile(rows: ImportRow[]): { unique: ImportRow[]; duplicates: FileDuplicate[] } {
  const byPhone = new Map<string, number>(), byEmail = new Map<string, number>(), byName = new Map<string, number>();
  const unique: ImportRow[] = [], duplicates: FileDuplicate[] = [];
  for (const r of rows) {
    const nameKey = plain(r.fullName);
    let dup: FileDuplicate | null = null;
    if (r.phoneNormalized && byPhone.has(r.phoneNormalized)) dup = { line: r.line, of: byPhone.get(r.phoneNormalized)!, reason: "mesmo telefone" };
    else if (r.email && byEmail.has(r.email)) dup = { line: r.line, of: byEmail.get(r.email)!, reason: "mesmo e-mail" };
    else if (!r.phoneNormalized && !r.email && byName.has(nameKey)) dup = { line: r.line, of: byName.get(nameKey)!, reason: "mesmo nome" };
    if (dup) { duplicates.push(dup); continue; }
    if (r.phoneNormalized) byPhone.set(r.phoneNormalized, r.line);
    if (r.email) byEmail.set(r.email, r.line);
    if (!r.phoneNormalized && !r.email) byName.set(nameKey, r.line);
    unique.push(r);
  }
  return { unique, duplicates };
}
