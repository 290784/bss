import { studio } from "@/data/studio";
import type { Bloco } from "@/data/types";
import { linkWhatsApp } from "@/services/booking";
import { Foto, Logo } from "@/components/ui/Brand";
import { ButtonA } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MapCard } from "@/components/ui/MapCard";
import { PriceTable } from "@/components/ui/PriceTable";

/** Renderiza os blocos de uma seção do Manual/Guia (o mesmo conteúdo vira o PDF). */
export function Blocos({ blocos, sobreMarca }: { blocos: Bloco[]; sobreMarca?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {blocos.map((b, i) => <BlocoView key={i} b={b} sobreMarca={sobreMarca} />)}
    </div>
  );
}

function BlocoView({ b, sobreMarca }: { b: Bloco; sobreMarca?: boolean }) {
  const { contato } = studio;
  switch (b.tipo) {
    case "paragrafo":
      return <p className={sobreMarca ? "text-md text-sobre-marca-suave" : "text-base leading-relaxed text-texto-suave"}>{b.texto}</p>;
    case "lista":
      return (
        <ul className="flex flex-col gap-2">
          {b.itens.map((t) => (
            <li key={t} className="flex gap-3 text-base text-texto-suave">
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rotate-45 rounded-[2px] bg-primaria" />{t}
            </li>
          ))}
        </ul>
      );
    case "topicos":
      return (
        <div className="flex flex-col gap-3">
          {b.itens.map((t) => (
            <div key={t.titulo} className="rounded-2xl border border-borda bg-afundado p-4">
              <h3 className="text-md font-extrabold tracking-wide text-primaria-texto">{t.titulo}</h3>
              <p className="mt-1 text-base leading-relaxed text-texto-suave">{t.texto}</p>
            </div>
          ))}
        </div>
      );
    case "destaque":
      return (
        <div className="rounded-2xl border border-primaria/40 bg-primaria-suave p-4">
          <p className="text-base font-medium text-texto">{b.texto}</p>
          {b.acao === "whatsapp" && (
            <ButtonA href={linkWhatsApp(studio, "Olá! Tenho uma dúvida sobre as minhas unhas.")} className="mt-3 w-full sm:w-auto">
              <Icon name="whatsapp" className="h-5 w-5" />Falar no WhatsApp
            </ButtonA>
          )}
        </div>
      );
    case "dicas":
      return (
        <div className="rounded-2xl border border-dashed border-borda-forte p-4">
          <h3 className="flex items-center gap-2 text-md font-bold text-texto"><Icon name="cinta" className="h-4 w-4 text-primaria-texto" />{b.titulo}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {b.itens.map((t) => <li key={t} className="text-base text-texto-suave">• {t}</li>)}
          </ul>
        </div>
      );
    case "fotos":
      return (
        <div className="grid grid-cols-2 gap-3">
          {b.fotos.map((f) => <Foto key={f.src} {...f} className="aspect-[4/5] rounded-2xl" />)}
        </div>
      );
    case "assinatura":
      return (
        <p className="text-base text-texto-suave">
          {b.despedida}<span className="mt-1 block font-assinatura text-[40px] leading-none text-primaria-texto">{b.nome}</span>
        </p>
      );
    case "valores":
      return <PriceTable itens={studio.valores.itens} notas={studio.valores.notas} />;
    case "localizacao": {
      const e = contato.endereco;
      return <MapCard endereco={`${e.linha.replace(", N ", " ")} – ${e.bairro} – ${e.uf}`} complemento={e.complemento} referencia={e.referencia}
        consulta={`${e.linha}, ${e.bairro}, ${e.cidade} - ${e.uf}`} />;
    }
    case "logo":
      return <Logo tamanho="lg" claro={sobreMarca} className="mt-2" />;
  }
}
