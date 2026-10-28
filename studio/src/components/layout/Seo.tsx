import { useEffect } from "react";

/** Título, descrição e Open Graph por rota (sem dependência extra). */
export function Seo({ titulo, descricao, caminho }: { titulo: string; descricao: string; caminho: string }) {
  useEffect(() => {
    document.title = titulo;
    const set = (sel: string, attr: "name" | "property", chave: string, valor: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, chave); document.head.appendChild(el); }
      el.content = valor;
    };
    const url = new URL(caminho, window.location.origin).toString();
    set('meta[name="description"]', "name", "description", descricao);
    set('meta[property="og:title"]', "property", "og:title", titulo);
    set('meta[property="og:description"]', "property", "og:description", descricao);
    set('meta[property="og:url"]', "property", "og:url", url);
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = url;
  }, [titulo, descricao, caminho]);
  return null;
}
