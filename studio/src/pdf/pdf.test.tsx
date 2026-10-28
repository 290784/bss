// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { studio } from "@/data/studio";
import { registrarFontes } from "./base";
import { ManualPdf } from "./ManualPdf";
import { GuiaPdf } from "./GuiaPdf";

const req = createRequire(import.meta.url);
registrarFontes({
  corpo400: req.resolve("@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff"),
  corpo600: req.resolve("@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff"),
  titulo800: req.resolve("@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff"),
  assinatura: req.resolve("@fontsource/allura/files/allura-latin-400-normal.woff"),
});

const paginas = (buf: Buffer) => (buf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
const saida = process.env.PDF_OUT;

describe("PDFs com a identidade BSS", () => {
  it("Manual: 7 páginas, uma por seção", async () => {
    const buf = await renderToBuffer(<ManualPdf studio={studio} />);
    if (saida) { mkdirSync(saida, { recursive: true }); writeFileSync(`${saida}/manual.pdf`, buf); }
    expect(paginas(buf)).toBe(7);
  }, 30_000);

  it("Guia: 4 páginas, uma por seção", async () => {
    const buf = await renderToBuffer(<GuiaPdf studio={studio} />);
    if (saida) { mkdirSync(saida, { recursive: true }); writeFileSync(`${saida}/guia.pdf`, buf); }
    expect(paginas(buf)).toBe(4);
  }, 30_000);
});
