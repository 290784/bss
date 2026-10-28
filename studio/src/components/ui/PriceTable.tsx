import type { ItemValor } from "@/data/types";
import { formatarPreco } from "@/utils/format";
import { cn } from "@/lib/cn";

/** Tabela de valores com linhas alternadas. */
export function PriceTable({ itens, notas, legenda = "Tabela de valores" }: { itens: ItemValor[]; notas?: string[]; legenda?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-card border border-borda">
        <table className="w-full text-base">
          <caption className="sr-only">{legenda}</caption>
          <thead className="bg-marca text-left text-sm text-sobre-marca">
            <tr><th scope="col" className="px-4 py-2.5 font-semibold">Serviço</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Valor</th></tr>
          </thead>
          <tbody>
            {itens.map((i, n) => (
              <tr key={i.nome} className={cn(n % 2 ? "bg-afundado" : "bg-superficie")}>
                <th scope="row" className="px-4 py-3 text-left font-medium text-texto">{i.nome}</th>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-texto tabular">{formatarPreco(i.precoCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notas && notas.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm text-texto-suave">
          {notas.map((n) => <li key={n} className="flex gap-2"><span aria-hidden className="text-primaria-texto">✦</span>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
