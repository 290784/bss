"use client";
import { ColumnChart, type ColumnDatum } from "@/components/charts/column-chart";
import { formatMoney } from "@/lib/money";

const compactMoney = (cents: number) => {
  const v = cents / 100;
  return v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(v)}`;
};

export function DashboardChart({ data, includeRevenue }: { data: ColumnDatum[]; includeRevenue: boolean }) {
  const series = [
    ...(includeRevenue ? [{ key: "revenue", label: "Recebido", format: formatMoney, axisFormat: compactMoney }] : []),
    { key: "appointments", label: "Atendimentos", format: (v: number) => `${v} atendimento(s)`, axisFormat: (v: number) => (Number.isInteger(v) ? String(v) : "") },
  ];
  return <ColumnChart data={data} series={series} />;
}
