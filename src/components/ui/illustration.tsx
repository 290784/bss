import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Ilustrações da Gê: objetos com volume suave sobre uma bolha rosada, na paleta do app
 * (ameixa clara, ameixa, champanhe). Desenhadas aqui, sem imagens externas.
 * Decorativas: sempre aria-hidden; o texto ao lado diz o que é.
 */
export type IllustrationName =
  | "wallet" | "calendar-check" | "calendar" | "clock" | "receipt" | "user-x" | "user-plus" | "coins"
  | "calendar-plus" | "lightbulb" | "chart";

// Cores fixas dos objetos (iguais nos dois temas); a bolha de fundo acompanha o tema.
const A1 = "#f8e1ed", A2 = "#d9a3c4"; // ameixa clara
const B1 = "#b9649a", B2 = "#7a2d63"; // ameixa
const G1 = "#f6e4b8", G2 = "#c6a05b"; // champanhe

function Defs() {
  return (
    <defs>
      <radialGradient id="ge-il-blob" cx="40%" cy="35%" r="70%">
        <stop offset="0%" style={{ stopColor: "var(--color-accent-muted)" }} />
        <stop offset="70%" style={{ stopColor: "var(--color-accent-subtle)" }} />
        <stop offset="100%" style={{ stopColor: "var(--color-accent-subtle)", stopOpacity: 0 }} />
      </radialGradient>
      <linearGradient id="ge-il-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={A1} /><stop offset="100%" stopColor={A2} /></linearGradient>
      <linearGradient id="ge-il-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={B1} /><stop offset="100%" stopColor={B2} /></linearGradient>
      <linearGradient id="ge-il-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={G1} /><stop offset="100%" stopColor={G2} /></linearGradient>
      <linearGradient id="ge-il-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f6eef2" /></linearGradient>
    </defs>
  );
}

/** Brilho champanhe de quatro pontas (o "detalhe dourado"). */
const Sparkle = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-5C.6-1.6 1.6-.6 5 0 1.6.6.6 1.6 0 5-.6 1.6-1.6.6-5 0-1.6-.6-.6-1.6 0-5Z" fill="url(#ge-il-g)" />
);
const Heart = ({ x, y, s = 1, fill = B2 }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 3.6C-3.4 1.2-5 -.6-5-2.6-5-4.2-3.8-5.4-2.4-5.4-1.4-5.4-.5-4.8 0-4-.5-4.8 .5-5.4 1.4-5.4 2.8-5.4 5-4.2 5-2.6 5-.6 3.4 1.2 0 3.6Z" fill={fill} />
);
/** Sombra macia sob o objeto. */
const Ground = ({ rx = 15 }: { rx?: number }) => <ellipse cx="32" cy="54" rx={rx} ry="3" fill={B2} opacity="0.12" />;

/** Calendário base (usado em três ilustrações). */
const Calendar = ({ children }: { children?: ReactNode }) => (
  <>
    <rect x="13" y="17" width="36" height="33" rx="8" fill="url(#ge-il-w)" stroke={A2} strokeOpacity="0.5" />
    <path d="M13 25a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v3H13v-3Z" fill="url(#ge-il-a)" />
    <rect x="21" y="13" width="4" height="9" rx="2" fill="url(#ge-il-b)" />
    <rect x="37" y="13" width="4" height="9" rx="2" fill="url(#ge-il-b)" />
    {children}
  </>
);
const Badge = ({ fill, children }: { fill: string; children: ReactNode }) => (
  <g><circle cx="46" cy="45" r="8.5" fill={fill} stroke="#fff" strokeWidth="2" />{children}</g>
);

const ART: Record<IllustrationName, ReactNode> = {
  wallet: (
    <>
      <Ground rx={17} />
      <path d="M16 22l22-7a3 3 0 0 1 3.8 2l1.6 5H16Z" fill="url(#ge-il-b)" opacity="0.85" />
      <rect x="11" y="21" width="40" height="29" rx="8" fill="url(#ge-il-a)" />
      <rect x="11" y="21" width="40" height="6" rx="3" fill="#fff" opacity="0.35" />
      <rect x="36" y="30" width="18" height="12" rx="6" fill="url(#ge-il-b)" />
      <circle cx="42" cy="36" r="2.4" fill={G1} />
      <Heart x={24} y={37} s={1.2} />
      <Sparkle x={52} y={15} s={0.9} />
    </>
  ),
  "calendar-check": (
    <>
      <Ground />
      <Calendar>
        <path d="M24 38l5 5 10-10" fill="none" stroke={B2} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </Calendar>
      <Sparkle x={53} y={14} s={0.9} />
    </>
  ),
  calendar: (
    <>
      <Ground />
      <Calendar>
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={19 + c * 7} y={32 + r * 5.5} width="4.5" height="3.5" rx="1.4" fill={r === 1 && c === 2 ? B2 : A2} opacity={r === 1 && c === 2 ? 1 : 0.7} />
        )))}
      </Calendar>
    </>
  ),
  clock: (
    <>
      <Ground rx={14} />
      <circle cx="32" cy="34" r="18" fill="url(#ge-il-a)" />
      <circle cx="32" cy="34" r="13" fill="url(#ge-il-w)" />
      <path d="M32 26v8l6 4" fill="none" stroke={B2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="34" r="2" fill={G2} />
      <Sparkle x={51} y={16} s={0.9} />
    </>
  ),
  receipt: (
    <>
      <Ground rx={13} />
      <path d="M18 14h26a2 2 0 0 1 2 2v34l-4.5-3-4.5 3-4.5-3-4.5 3-4.5-3-4.5 3-4.5-3V16a2 2 0 0 1 2-2Z" fill="url(#ge-il-w)" stroke={A2} strokeOpacity="0.6" />
      <rect x="22" y="21" width="18" height="3.4" rx="1.7" fill={A2} />
      <rect x="22" y="28" width="12" height="3.4" rx="1.7" fill={A2} opacity="0.7" />
      <rect x="22" y="35" width="15" height="3.4" rx="1.7" fill={A2} opacity="0.7" />
      <circle cx="46" cy="44" r="8" fill="url(#ge-il-g)" stroke="#fff" strokeWidth="2" />
      <Heart x={46} y={45} s={0.75} fill="#fff" />
    </>
  ),
  "user-x": (
    <>
      <Ground rx={14} />
      <circle cx="29" cy="25" r="9" fill="url(#ge-il-a)" />
      <path d="M13 50c0-9 7-15 16-15s16 6 16 15H13Z" fill="url(#ge-il-a)" />
      <circle cx="26" cy="22" r="3" fill="#fff" opacity="0.45" />
      <Badge fill="url(#ge-il-b)"><path d="M43 42l6 6M49 42l-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></Badge>
    </>
  ),
  "user-plus": (
    <>
      <Ground rx={14} />
      <circle cx="29" cy="25" r="9" fill="url(#ge-il-a)" />
      <path d="M13 50c0-9 7-15 16-15s16 6 16 15H13Z" fill="url(#ge-il-a)" />
      <circle cx="26" cy="22" r="3" fill="#fff" opacity="0.45" />
      <Badge fill="url(#ge-il-g)"><path d="M46 41v8M42 45h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></Badge>
      <Sparkle x={47} y={16} s={0.8} />
    </>
  ),
  coins: (
    <>
      <Ground rx={17} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <ellipse cx="25" cy={46 - i * 6} rx="11" ry="4.5" fill={G2} />
          <ellipse cx="25" cy={44 - i * 6} rx="11" ry="4.5" fill="url(#ge-il-g)" />
        </g>
      ))}
      <circle cx="42" cy="34" r="11" fill="url(#ge-il-b)" />
      <circle cx="42" cy="34" r="8" fill="none" stroke="#fff" strokeOpacity="0.35" />
      <Heart x={42} y={35} s={0.9} fill="#fff" />
      <Sparkle x={53} y={17} s={0.8} />
    </>
  ),
  "calendar-plus": (
    <>
      <Ground />
      <Calendar>
        <rect x="20" y="33" width="5" height="4" rx="1.4" fill={A2} opacity="0.7" />
        <rect x="28" y="33" width="5" height="4" rx="1.4" fill={A2} opacity="0.7" />
        <rect x="20" y="40" width="5" height="4" rx="1.4" fill={A2} opacity="0.7" />
      </Calendar>
      <Badge fill="url(#ge-il-b)"><path d="M46 41v8M42 45h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></Badge>
    </>
  ),
  lightbulb: (
    <>
      <Ground rx={11} />
      <path d="M32 12c-8.3 0-14 6.2-14 13.6 0 5 2.6 8.3 5.4 11 1.4 1.4 2.1 3 2.1 4.9V43h13v-1.5c0-1.9.7-3.5 2.1-4.9 2.8-2.7 5.4-6 5.4-11C46 18.2 40.3 12 32 12Z" fill="url(#ge-il-g)" />
      <path d="M25 20c1.6-2.4 4-3.6 6.6-3.8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      <rect x="25" y="44" width="14" height="4" rx="2" fill="url(#ge-il-b)" />
      <rect x="27" y="49" width="10" height="3.4" rx="1.7" fill="url(#ge-il-b)" opacity="0.8" />
      <Sparkle x={50} y={16} s={1} />
      <Sparkle x={14} y={22} s={0.6} />
    </>
  ),
  chart: (
    <>
      <Ground rx={17} />
      <rect x="14" y="34" width="9" height="16" rx="3.5" fill="url(#ge-il-a)" />
      <rect x="27" y="26" width="9" height="24" rx="3.5" fill="url(#ge-il-b)" />
      <rect x="40" y="18" width="9" height="32" rx="3.5" fill="url(#ge-il-g)" />
      <path d="M16 28l12-8 9 4 11-10" fill="none" stroke={B2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <Sparkle x={52} y={12} s={0.8} />
    </>
  ),
};

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-12 w-12 shrink-0", className)} aria-hidden focusable="false">
      <Defs />
      <circle cx="32" cy="34" r="30" fill="url(#ge-il-blob)" />
      {ART[name]}
    </svg>
  );
}
