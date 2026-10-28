import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tom = "sucesso" | "neutro" | "primaria" | "alerta";
const tons: Record<Tom, string> = {
  sucesso: "bg-sucesso/15 text-sucesso ring-sucesso/30",
  neutro: "bg-afundado text-texto-suave ring-borda",
  primaria: "bg-primaria-suave text-primaria-texto ring-primaria/30",
  alerta: "bg-alerta/15 text-alerta ring-alerta/30",
};
export function Badge({ children, tom = "neutro", ponto, className }: { children: ReactNode; tom?: Tom; ponto?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1", tons[tom], className)}>
      {ponto && <span className="h-2 w-2 rounded-full bg-current" aria-hidden />}{children}
    </span>
  );
}
