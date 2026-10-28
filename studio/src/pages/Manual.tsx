import { studio } from "@/data/studio";
import { Seo } from "@/components/layout/Seo";
import { DocumentoView } from "@/components/documento/Documento";

export default function Manual() {
  return (
    <>
      <Seo titulo={studio.seo.manual.titulo} descricao={studio.seo.manual.descricao} caminho="/manual" />
      <DocumentoView doc={studio.manual} tipo="manual" />
    </>
  );
}
