import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { studio } from "@/data/studio";
import corpo400 from "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url";
import corpo600 from "@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff?url";
import titulo800 from "@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff?url";
import assinatura from "@fontsource/allura/files/allura-latin-400-normal.woff?url";
import { registrarFontes } from "./base";
import { ManualPdf } from "./ManualPdf";
import { GuiaPdf } from "./GuiaPdf";

/** Gera o PDF no navegador (a partir de studio.ts) e baixa o arquivo. */
export async function baixarPdf(tipo: "manual" | "guia", nomeArquivo: string) {
  registrarFontes({ corpo400, corpo600, titulo800, assinatura });
  const el = tipo === "manual" ? createElement(ManualPdf, { studio }) : createElement(GuiaPdf, { studio });
  // @ts-expect-error — pdf() aceita o elemento <Document>; os tipos pedem ReactElement<DocumentProps>.
  const blob = await pdf(el).toBlob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nomeArquivo });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
