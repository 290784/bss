import { studio } from "@/data/studio";

export function Footer() {
  const { creditos, nome } = studio.marca;
  return (
    <footer className="mx-auto max-w-2xl px-4 pt-10 pb-28 text-center text-sm text-texto-apoio">
      <p>© {new Date().getFullYear()} {nome}</p>
      <p className="mt-1">{creditos.url ? <a href={creditos.url} className="underline" target="_blank" rel="noreferrer">{creditos.texto}</a> : creditos.texto}</p>
    </footer>
  );
}
