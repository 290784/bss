import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const CHAVE_TEMA = "studio-tema";
const ler = () => (document.documentElement.dataset.theme === "claro" ? "claro" : "escuro");
const assinar = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

/** Escuro é o padrão do BSS; o claro fica salvo no aparelho. */
export function ThemeToggle({ className }: { className?: string }) {
  const tema = useSyncExternalStore(assinar, ler, () => "escuro");
  const proximo = tema === "claro" ? "escuro" : "claro";
  return (
    <button type="button" className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-texto-suave transition hover:bg-afundado hover:text-texto", className)}
      aria-label={proximo === "claro" ? "Usar tema claro" : "Usar tema escuro"}
      onClick={() => {
        if (proximo === "claro") document.documentElement.dataset.theme = "claro"; else delete document.documentElement.dataset.theme;
        try { localStorage.setItem(CHAVE_TEMA, proximo); } catch { /* modo privado */ }
      }}>
      <Icon name={tema === "claro" ? "lua" : "sol"} />
    </button>
  );
}
