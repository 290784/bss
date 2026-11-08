/** Célula de CSV (separador ";", aspas quando preciso) com proteção contra fórmulas de planilha (=, +, -, @). */
export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const csvLine = (cells: unknown[]) => cells.map(csvCell).join(";");

/** CSV com BOM (abre com acentos certos no Excel). */
export const csvBody = (header: string[], lines: unknown[][]) => "﻿" + [csvLine(header), ...lines.map(csvLine)].join("\n");

export const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
