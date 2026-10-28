import { Link } from "react-router";
import { studio } from "@/data/studio";
import { linkWhatsApp } from "@/services/booking";
import { Seo } from "@/components/layout/Seo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Foto, Sparkles } from "@/components/ui/Brand";
import { Icon } from "@/components/ui/Icon";
import { PdfViewerCard } from "@/components/ui/PdfViewerCard";
import { Badge } from "@/components/ui/Badge";

/** "Linktree" do studio: perfil, contatos e os três caminhos principais. */
export default function Links() {
  const { marca, perfil, links, contato, seo, manual, guia } = studio;
  const capa = { "/manual": manual.titulo, "/guia": guia.titulo } as Record<string, string>;
  return (
    <>
      <Seo titulo={seo.links.titulo} descricao={seo.links.descricao} caminho="/" />
      <div className="flex justify-end pt-3"><ThemeToggle /></div>
      <section className="flex flex-col items-center gap-3 pt-2 text-center" aria-labelledby="nome-studio">
        <span className="relative">
          <span aria-hidden className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_200deg,var(--color-primaria),var(--color-secundaria),var(--color-primaria-escura),var(--color-primaria))] opacity-90 blur-[1px]" />
          <span aria-hidden className="absolute -inset-4 rounded-full bg-primaria/15 blur-2xl" />
          <Foto {...marca.foto} selo={false} className="relative h-28 w-28 rounded-full ring-4 ring-fundo" />
          <Sparkles className="-inset-6" />
        </span>
        {marca.foto.placeholder && <span className="text-xs font-semibold text-alerta">Foto provisória</span>}
        <div>
          <h1 id="nome-studio" className="text-shimmer text-xl font-extrabold sm:text-2xl">{marca.nome}</h1>
          <p className="mt-0.5 text-base font-medium text-primaria-texto">{marca.subtitulo}</p>
        </div>
        <p className="max-w-sm text-base text-texto-suave">{perfil.bio}</p>
        <p className="flex items-center gap-1 text-sm text-texto-apoio"><Icon name="pino" className="h-4 w-4" />{marca.cidade}</p>
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Destaques">
          {perfil.destaques.map((d) => <li key={d}><Badge tom="primaria">{d}</Badge></li>)}
        </ul>
        <div className="mt-1 flex gap-3">
          <a href={linkWhatsApp(studio)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${contato.whatsapp.exibicao}`}
            className="lift icone-social grid h-12 w-12 place-items-center rounded-full border shadow-card"><Icon name="whatsapp" className="h-6 w-6" /></a>
          <a href={perfil.instagram.url} target="_blank" rel="noreferrer" aria-label={`Instagram ${perfil.instagram.usuario}`}
            className="lift icone-social grid h-12 w-12 place-items-center rounded-full border shadow-card"><Icon name="instagram" className="h-6 w-6" /></a>
        </div>
      </section>

      <nav aria-label="Links principais" className="mt-8">
        <ul className="flex flex-col gap-3">
          {links.map((l) => (
            <li key={l.rota}>
              {l.tipo === "pdf" && l.paginas ? (
                <PdfViewerCard titulo={l.titulo} paginas={l.paginas} rota={l.rota} capaTitulo={capa[l.rota] ?? l.titulo} />
              ) : (
                <Link to={l.rota} className="lift moldura group flex min-h-20 items-center gap-4 rounded-card border bg-superficie p-4 text-texto shadow-card">
                  <span className="bg-botao grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sobre-marca"><Icon name="calendario" className="h-6 w-6" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-md font-bold">{l.titulo}</span>
                    {l.descricao && <span className="mt-0.5 block text-sm text-texto-apoio">{l.descricao}</span>}
                  </span>
                  <Icon name="seta" className="h-5 w-5 shrink-0 text-primaria-texto transition group-hover:translate-x-0.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-6 text-center text-sm text-texto-apoio">
        <a href={perfil.instagram.url} target="_blank" rel="noreferrer" className="underline">{perfil.instagram.usuario}</a> · {perfil.instagram.nome}
      </p>
    </>
  );
}
