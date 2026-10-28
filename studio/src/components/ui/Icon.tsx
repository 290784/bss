import type { SVGProps } from "react";

/** Ícones de traço (24×24, currentColor). Inline para não carregar biblioteca inteira. */
const PATHS = {
  whatsapp: "M3 21l1.65-4.83A8.5 8.5 0 1 1 7.9 19.6L3 21Zm5.2-12.9c-.3 0-.8.1-1.1.6-.4.5-1 1.1-1 2.6s1.1 3 1.2 3.2c.2.2 2.1 3.3 5.2 4.5 2.6 1 3.1.8 3.7.7.6-.1 1.8-.8 2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.4l-1.9-.9c-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.5-.4-.5-.6-.5h-.5Z",
  instagram: "M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm4.5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.25-1.6a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Z",
  arquivo: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4",
  calendario: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4",
  relogio: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  pino: "M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  telefone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  baixar: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
  compartilhar: "M12 15V4m0 0L8 8m4-4 4 4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7",
  seta: "M5 12h14m0 0-6-6m6 6-6 6",
  voltar: "M19 12H5m0 0 6-6m-6 6 6 6",
  baixo: "m6 9 6 6 6-6",
  check: "m5 12 5 5 9-10",
  sol: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  lua: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  externo: "M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  cinta: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const solid = name === "whatsapp" || name === "cinta";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className ?? "h-5 w-5"} fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
