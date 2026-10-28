import { studio } from "@/data/studio";
import { Seo } from "@/components/layout/Seo";
import { DocumentoView } from "@/components/documento/Documento";

export default function Guia() {
  return (
    <>
      <Seo titulo={studio.seo.guia.titulo} descricao={studio.seo.guia.descricao} caminho="/guia" />
      <DocumentoView doc={studio.guia} tipo="guia" />
    </>
  );
}
