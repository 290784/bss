import { Link } from "react-router";
import { Icon } from "./Icon";

/** Cartão de documento: miniatura, título e "PDF · N páginas". */
export function PdfViewerCard({ titulo, paginas, rota, capaTitulo }: { titulo: string; paginas: number; rota: string; capaTitulo: string }) {
  return (
    <Link to={rota} className="group flex items-center gap-4 rounded-card border border-borda bg-superficie p-3 pr-4 shadow-card transition hover:border-primaria/60 active:scale-[0.99]">
      {/* Miniatura: capa do documento no degradê da marca */}
      <span aria-hidden className="bg-marca relative flex h-20 w-16 shrink-0 flex-col justify-end overflow-hidden rounded-xl p-1.5 shadow-card">
        <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-sobre-marca-suave">PDF</span>
        <span className="line-clamp-3 font-titulo text-[9px] leading-tight font-extrabold text-sobre-marca">{capaTitulo}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-md font-semibold text-texto">{titulo}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-texto-apoio"><Icon name="arquivo" className="h-4 w-4" />PDF · {paginas} páginas</span>
      </span>
      <Icon name="seta" className="h-5 w-5 shrink-0 text-primaria-texto transition group-hover:translate-x-0.5" />
    </Link>
  );
}
