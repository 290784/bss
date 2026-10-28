import { useState } from "react";
import type { Documento } from "@/data/types";
import { Foto, Sparkles } from "@/components/ui/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { Blocos } from "./Blocos";

/** Manual/Guia como página web: seções empilhadas com "N de total", baixar PDF e compartilhar. */
export function DocumentoView({ doc, tipo }: { doc: Documento; tipo: "manual" | "guia" }) {
  const total = doc.secoes.length;
  return (
    <article className="flex flex-col gap-4 pt-4" aria-labelledby="titulo-doc">
      <div className="flex flex-col gap-3">
        <h1 id="titulo-doc" className="text-xl font-extrabold text-texto">{doc.titulo}</h1>
        <p className="text-base text-texto-suave">{doc.descricao}</p>
        <Acoes doc={doc} tipo={tipo} />
      </div>
      <ol className="flex flex-col gap-4">
        {doc.secoes.map((s, i) => {
          const marca = s.estilo === "capa" || s.estilo === "encerramento";
          return (
            <li key={s.id} id={s.id}>
              <Card as="section" aria-labelledby={`t-${s.id}`}
                className={cn("relative overflow-hidden p-5 sm:p-6", marca && "moldura")}>
                {marca && <Sparkles tom="text-primaria/70" />}
                <div className="relative flex items-center justify-between gap-3">
                  <span className={cn("text-sm font-semibold tabular", "text-texto-apoio")}>{i + 1} de {total}</span>
                </div>
                <div className="relative mt-2 flex flex-col gap-4">
                  <div>
                    <h2 id={`t-${s.id}`} className={cn("font-extrabold", s.estilo === "capa" ? "text-xl sm:text-2xl" : "text-lg sm:text-xl", "text-texto")}>{s.titulo}</h2>
                    {s.subtitulo && <p className={cn("mt-1 text-md font-semibold", "text-primaria-texto")}>{s.subtitulo}</p>}
                  </div>
                  {s.imagem && <Foto {...s.imagem} className="aspect-[4/3] rounded-2xl ring-1 ring-borda" />}
                  <Blocos blocos={s.blocos} />
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function Acoes({ doc, tipo }: { doc: Documento; tipo: "manual" | "guia" }) {
  const [estado, setEstado] = useState<"" | "gerando" | "copiado" | "erro">("");
  const baixar = async () => {
    setEstado("gerando");
    try {
      // O gerador de PDF é pesado: só carrega quando a pessoa pede o arquivo.
      const { baixarPdf } = await import("@/pdf/gerar");
      await baixarPdf(tipo, doc.nomeArquivoPdf);
      setEstado("");
    } catch (e) {
      console.error(e);
      setEstado("erro");
    }
  };
  const compartilhar = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: doc.titulo, text: doc.descricao, url }); return; }
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
      setTimeout(() => setEstado(""), 3000);
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setEstado("erro");
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={baixar} disabled={estado === "gerando"}><Icon name="baixar" />{estado === "gerando" ? "Gerando…" : "Baixar PDF"}</Button>
        <Button variante="secundaria" onClick={compartilhar}><Icon name="compartilhar" />Compartilhar</Button>
      </div>
      <p role="status" className="min-h-5 text-sm text-texto-apoio">
        {estado === "copiado" ? "Link copiado." : estado === "erro" ? "Não foi possível concluir. Tente de novo." : ""}
      </p>
    </div>
  );
}
