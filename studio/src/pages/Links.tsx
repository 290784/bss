import { Link } from "react-router";
import { studio } from "@/data/studio";
import type { Imagem } from "@/data/types";
import { linkWhatsApp } from "@/services/booking";
import { Seo } from "@/components/layout/Seo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Sparkles } from "@/components/ui/Brand";
import { Icon } from "@/components/ui/Icon";
import { PdfViewerCard } from "@/components/ui/PdfViewerCard";
import { Badge } from "@/components/ui/Badge";

/**
 * Página inicial ("linktree" do studio): a foto da Manoella abre a página, o cartão com nome, bio e
 * contatos sobe por cima dela, depois os três caminhos principais e uma galeria com fotos reais dos
 * trabalhos (as mesmas do Manual), com crédito.
 */
export default function Links() {
  const { marca, perfil, links, contato, seo, manual, guia } = studio;
  const capa = { "/manual": manual.titulo, "/guia": guia.titulo } as Record<string, string>;
  const fotoCapa = manual.secoes.find((s) => s.estilo === "capa")?.imagem;
  // Galeria: as fotos dos serviços do Manual, com o nome do serviço na legenda.
  const trabalhos = manual.secoes.flatMap((s) =>
    s.blocos.flatMap((b) => (b.tipo === "fotos" ? b.fotos.map((f: Imagem) => ({ ...f, servico: s.subtitulo ?? s.titulo })) : [])),
  );
  return (
    <>
      <Seo titulo={seo.links.titulo} descricao={seo.links.descricao} caminho="/" />

      {/* Topo: foto da Manoella de ponta a ponta, esmaecendo no fundo da página. */}
      <div className="relative -mx-4 h-[460px] overflow-hidden sm:mx-0 sm:mt-4 sm:h-[520px] sm:rounded-[40px]">
        {fotoCapa && <img src={fotoCapa.src} alt={fotoCapa.alt} className="h-full w-full object-cover object-[50%_12%]" fetchPriority="high" decoding="async" />}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(44_28_30/0.06)_0%,transparent_30%,transparent_62%,var(--color-fundo)_100%)]" />
        <ThemeToggle className="absolute top-3 right-3 bg-fundo/70 backdrop-blur-md" />
      </div>

      <section aria-labelledby="nome-studio"
        className="moldura relative -mt-20 flex flex-col items-center gap-3 rounded-card border bg-superficie/92 px-5 pt-7 pb-6 text-center shadow-card backdrop-blur-md">
        <Sparkles className="-inset-1" tom="text-primaria" />
        {fotoCapa?.placeholder && <span className="text-xs font-semibold text-alerta">Foto provisória</span>}
        <div>
          <h1 id="nome-studio" className="text-2xl text-texto sm:text-[40px]">{marca.nome}</h1>
          <p className="mt-1.5 text-sm font-semibold tracking-[0.08em] text-primaria-texto uppercase">{marca.subtitulo}</p>
        </div>
        <p className="max-w-sm text-base leading-relaxed text-texto-suave">{perfil.bio}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-texto-apoio"><Icon name="pino" className="h-4 w-4" />{marca.cidade}</span>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Destaques">
            {perfil.destaques.map((d) => <li key={d}><Badge tom="primaria">{d}</Badge></li>)}
          </ul>
        </div>
        <div className="mt-1 grid w-full max-w-sm grid-cols-2 gap-2.5">
          <a href={linkWhatsApp(studio)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${contato.whatsapp.exibicao}`}
            className="lift bg-botao inline-flex h-12 items-center justify-center gap-2 rounded-botao px-4 text-base font-semibold text-sobre-marca">
            <Icon name="whatsapp" className="h-5 w-5" /><span aria-hidden>WhatsApp</span>
          </a>
          <a href={perfil.instagram.url} target="_blank" rel="noreferrer" aria-label={`Instagram ${perfil.instagram.usuario}`}
            className="lift moldura inline-flex h-12 items-center justify-center gap-2 rounded-botao border bg-superficie px-4 text-base font-semibold text-primaria-texto">
            <Icon name="instagram" className="h-5 w-5" /><span aria-hidden>Instagram</span>
          </a>
        </div>
      </section>

      <nav aria-label="Links principais" className="mt-6">
        <ul className="flex flex-col gap-3">
          {links.map((l) => (
            <li key={l.rota}>
              {l.tipo === "pdf" && l.paginas ? (
                <PdfViewerCard titulo={l.titulo} paginas={l.paginas} rota={l.rota} capaTitulo={capa[l.rota] ?? l.titulo} />
              ) : (
                <Link to={l.rota} className="lift bg-marca group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-card p-4 pr-5 text-sobre-marca shadow-card">
                  <Sparkles className="opacity-70" />
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sobre-marca/15 ring-1 ring-sobre-marca/30"><Icon name="calendario" className="h-7 w-7" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-titulo text-[26px] leading-tight font-bold">{l.titulo}</span>
                    {l.descricao && <span className="mt-0.5 block text-sm text-sobre-marca-suave">{l.descricao}</span>}
                  </span>
                  <Icon name="seta" className="h-6 w-6 shrink-0 transition group-hover:translate-x-0.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {trabalhos.length > 0 && (
        <section aria-labelledby="trabalhos" className="mt-10">
          <h2 id="trabalhos" className="mb-3 text-xl text-texto">Trabalhos da Manoella</h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {trabalhos.map((t) => (
              <li key={t.src}>
                <figure className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-afundado shadow-card">
                  {/* As fotos vieram do Manual com cantos arredondados: um leve zoom esconde as bordas. */}
                  <img src={t.src} alt={t.alt} loading="lazy" decoding="async" className="h-full w-full scale-[1.24] object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgb(44_28_30/0.72))] px-3 pt-8 pb-2.5 text-left text-sm font-semibold text-sobre-marca">
                    {t.servico}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-texto-apoio">
            Fotos: trabalhos reais de Manoella Lopes, publicados em <a href={perfil.instagram.url} target="_blank" rel="noreferrer" className="underline">{perfil.instagram.usuario}</a>.
          </p>
        </section>
      )}

      <p className="mt-8 text-center text-sm text-texto-apoio">
        <a href={perfil.instagram.url} target="_blank" rel="noreferrer" className="underline">{perfil.instagram.usuario}</a> · {perfil.instagram.nome}
      </p>
    </>
  );
}
