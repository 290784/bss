import { studio } from "@/data/studio";
import { Seo } from "@/components/layout/Seo";
import { ButtonLink } from "@/components/ui/Button";

export default function NaoEncontrada() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Seo titulo={`Página não encontrada · ${studio.marca.nome}`} descricao={studio.seo.links.descricao} caminho="/" />
      <h1 className="text-xl font-extrabold">Página não encontrada</h1>
      <p className="text-texto-suave">O endereço pode estar incorreto.</p>
      <ButtonLink to="/">Voltar ao início</ButtonLink>
    </div>
  );
}
