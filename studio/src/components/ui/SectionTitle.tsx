import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Título de seção em destaque, com o brilho da marca. */
export function SectionTitle({ children, sub, id, className, as: Tag = "h2" }: { children: ReactNode; sub?: ReactNode; id?: string; className?: string; as?: "h1" | "h2" | "h3" }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Tag id={id} className="flex items-center gap-2 text-lg font-extrabold text-texto sm:text-xl">
        <Icon name="cinta" className="h-4 w-4 shrink-0 text-primaria-texto" />{children}
      </Tag>
      {sub && <p className="text-base text-texto-suave">{sub}</p>}
    </div>
  );
}
