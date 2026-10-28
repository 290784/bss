import { Document } from "@react-pdf/renderer";
import type { Studio } from "@/data/types";
import { paginasDoDocumento } from "./base";

export function ManualPdf({ studio }: { studio: Studio }) {
  return (
    <Document title={`${studio.manual.titulo} · ${studio.marca.nome}`} author={studio.marca.nome} language="pt-BR" subject={studio.manual.descricao}>
      {paginasDoDocumento(studio.manual, studio)}
    </Document>
  );
}
