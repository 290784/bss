"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export type ColumnSeries = { key: string; label: string; format: (v: number) => string; axisFormat: (v: number) => string };
export type ColumnDatum = { label: string; longLabel: string; values: Record<string, number> };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Colunas de série única com abas (nunca dois eixos Y). Tooltip por coluna,
 * eixo com ticks arredondados e visão em tabela para acessibilidade.
 */
export function ColumnChart({ data, series, height = 220 }: { data: ColumnDatum[]; series: ColumnSeries[]; height?: number }) {
  const [active, setActive] = useState(series[0]!.key);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const s = series.find((x) => x.key === active)!;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.values[active] ?? 0))), [data, active]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / 10);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Métrica do gráfico" className="flex rounded-[10px] bg-sunken p-1">
          {series.map((x) => (
            <button key={x.key} role="tab" aria-selected={active === x.key} onClick={() => setActive(x.key)}
              className={cn("h-7 rounded-md px-3 text-[13px] font-medium", active === x.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
              {x.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAsTable(!asTable)} className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline">
          {asTable ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-[260px] overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-canvas text-left text-xs text-muted"><tr><th className="px-3 py-2 font-medium">Dia</th>{series.map((x) => <th key={x.key} className="px-3 py-2 text-right font-medium">{x.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((d) => <tr key={d.longLabel}><td className="px-3 py-1.5">{d.longLabel}</td>{series.map((x) => <td key={x.key} className="px-3 py-1.5 text-right tabular">{x.format(d.values[x.key] ?? 0)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-6 flex" style={{ height }}>
          <div className="relative w-[72px] shrink-0 text-[11px] text-muted tabular" aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="absolute right-2 whitespace-nowrap" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>{s.axisFormat(t)}</span>
            ))}
          </div>
          <div className="relative flex-1" onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />)}
            <div className="absolute inset-0 flex items-end" role="img" aria-label={`${s.label} por dia`}>
              {data.map((d, i) => {
                const v = d.values[active] ?? 0;
                return (
                  <div key={i} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
                    aria-label={`${d.longLabel}: ${s.format(v)}`}>
                    <div className={cn("w-[min(24px,70%)] rounded-t-[4px] transition-colors", hover === i ? "bg-plum-700" : "bg-plum-500")}
                      style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }} />
                    {i % labelEvery === 0 && <span className="absolute -bottom-5 text-[11px] text-muted tabular">{d.label}</span>}
                  </div>
                );
              })}
            </div>
            {hover !== null && data[hover] && (
              <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-[var(--shadow-pop)]"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: `calc(${((data[hover].values[active] ?? 0) / max) * 100}% + 8px)` }}>
                <div className="text-white/70">{data[hover].longLabel}</div>
                <div className="font-semibold tabular">{s.format(data[hover].values[active] ?? 0)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {!asTable && <div className="h-6" />}
    </div>
  );
}
