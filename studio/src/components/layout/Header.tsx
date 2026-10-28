import { Link, useLocation } from "react-router";
import { Logo } from "@/components/ui/Brand";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "./ThemeToggle";

/** Cabeçalho das páginas internas: voltar para os links, logo e tema. A página de links tem o próprio topo. */
export function Header() {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return (
    <header className="sticky top-[env(safe-area-inset-top)] z-30 border-b border-borda bg-fundo/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-2 px-4">
        <Link to="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-texto-suave hover:bg-afundado hover:text-texto" aria-label="Voltar para o início">
          <Icon name="voltar" />
        </Link>
        <Link to="/" className="min-w-0 flex-1"><Logo tamanho="sm" /></Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
