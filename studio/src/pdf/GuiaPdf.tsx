import { Document } from "@react-pdf/renderer";
import type { Studio } from "@/data/types";
import { paginasDoDocumento } from "./base";

export function GuiaPdf({ studio }: { studio: Studio }) {
  return (
    <Document title={`${studio.guia.titulo} · ${studio.marca.nome}`} author={studio.marca.nome} language="pt-BR" subject={studio.guia.descricao}>
      {paginasDoDocumento(studio.guia, studio)}
    </Document>
  );
}
