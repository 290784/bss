import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Item de acordeão controlado (o pai garante "um aberto por vez"). */
export function AccordionItem({ aberto, onToggle, titulo, resumo, children }: {
  aberto: boolean; onToggle: () => void; titulo: ReactNode; resumo?: ReactNode; children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("glow-hover rounded-card border bg-superficie shadow-card transition-colors", aberto ? "border-primaria/60" : "border-borda")}>
      <h3>
        <button type="button" aria-expanded={aberto} aria-controls={`${id}-painel`} id={`${id}-botao`} onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-md font-semibold text-texto">{titulo}</span>
            {resumo && <span className="mt-0.5 block font-corpo text-sm tabular text-texto-apoio">{resumo}</span>}
          </span>
          <Icon name="baixo" className={cn("h-5 w-5 shrink-0 text-primaria-texto transition-transform", aberto && "rotate-180")} />
        </button>
      </h3>
      <div id={`${id}-painel`} role="region" aria-labelledby={`${id}-botao`} hidden={!aberto} className="border-t border-borda px-4 pt-3 pb-4">
        {children}
      </div>
    </div>
  );
}
