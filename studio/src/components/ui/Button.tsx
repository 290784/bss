import type { ComponentProps } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";

type Variante = "primaria" | "secundaria" | "fantasma";
const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-botao px-5 text-base font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const variantes: Record<Variante, string> = {
  primaria: "bg-botao text-sobre-marca hover:brightness-110",
  secundaria: "border border-borda-forte bg-superficie text-texto hover:bg-afundado",
  fantasma: "text-primaria-texto hover:bg-afundado",
};
export const botao = (v: Variante = "primaria", extra?: string) => cn(base, variantes[v], extra);

export function Button({ variante, className, type = "button", ...p }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button type={type} className={botao(variante, className)} {...p} />;
}
/** Link externo (WhatsApp, mapa…) com o visual de botão. */
export function ButtonA({ variante, className, ...p }: ComponentProps<"a"> & { variante?: Variante }) {
  return <a className={botao(variante, className)} target="_blank" rel="noreferrer" {...p} />;
}
export function ButtonLink({ variante, className, ...p }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={botao(variante, className)} {...p} />;
}
