import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Ilustrações da Gê: objetos com volume macio e brilho (estilo "3D suave"), sobre um halo rosado.
 * Paleta do app: rosé (tons claros da ameixa), ameixa e champanhe. Desenhadas aqui em SVG, sem
 * imagens externas. Decorativas: sempre aria-hidden; o texto ao lado diz o que é.
 */
export type IllustrationName =
  | "wallet" | "calendar-check" | "calendar" | "calendar-plus" | "calendar-off" | "clock" | "receipt"
  | "user-x" | "user-plus" | "team" | "coins" | "lightbulb" | "chart" | "heart" | "gift" | "sparkles"
  | "scissors" | "chat" | "shield" | "store" | "notebook" | "bell" | "link" | "star";

// Cores fixas dos objetos (iguais nos dois temas); o halo acompanha o tema.
const R1 = "#fff0f6", R2 = "#f6c3d8", R3 = "#e392b6"; // rosé: luz, meio, sombra
const B1 = "#c473a6", B2 = "#7a2d63"; // ameixa
const G1 = "#fbefcf", G2 = "#d9b46e", G3 = "#b58a3e"; // champanhe
const W1 = "#ffffff", W2 = "#f7eef3"; // papel

function Defs() {
  return (
    <defs>
      <radialGradient id="ge-il-halo" cx="50%" cy="45%" r="55%">
        <stop offset="0%" style={{ stopColor: "var(--color-accent-muted)", stopOpacity: 0.95 }} />
        <stop offset="60%" style={{ stopColor: "var(--color-accent-subtle)", stopOpacity: 0.85 }} />
        <stop offset="100%" style={{ stopColor: "var(--color-accent-subtle)", stopOpacity: 0 }} />
      </radialGradient>
      <linearGradient id="ge-il-r" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor={R1} /><stop offset="45%" stopColor={R2} /><stop offset="100%" stopColor={R3} /></linearGradient>
      <linearGradient id="ge-il-b" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor={B1} /><stop offset="100%" stopColor={B2} /></linearGradient>
      <linearGradient id="ge-il-g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor={G1} /><stop offset="55%" stopColor={G2} /><stop offset="100%" stopColor={G3} /></linearGradient>
      <linearGradient id="ge-il-w" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stopColor={W1} /><stop offset="100%" stopColor={W2} /></linearGradient>
      <linearGradient id="ge-il-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f4eef2" /><stop offset="100%" stopColor="#bfaab8" /></linearGradient>
      {/* Sombra macia sob o objeto e brilho desfocado por cima (o "volume"). */}
      <filter id="ge-il-drop" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor={B2} floodOpacity="0.22" />
      </filter>
      <filter id="ge-il-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.9" /></filter>
    </defs>
  );
}

/** Brilho desfocado (reflexo de luz). */
const Gloss = ({ d, o = 0.7 }: { d: string; o?: number }) => <path d={d} fill="#fff" opacity={o} filter="url(#ge-il-blur)" />;
/** Brilho champanhe de quatro pontas. */
const Sparkle = ({ x, y, s = 1, fill = "url(#ge-il-g)" }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-5C.6-1.6 1.6-.6 5 0 1.6.6.6 1.6 0 5-.6 1.6-1.6.6-5 0-1.6-.6-.6-1.6 0-5Z" fill={fill} />
);
const HEART = "M0 4C-3.8 1.3-5.6-.7-5.6-2.9-5.6-4.7-4.3-6-2.7-6-1.6-6-.6-5.4 0-4.5.6-5.4 1.6-6 2.7-6 4.3-6 5.6-4.7 5.6-2.9 5.6-.7 3.8 1.3 0 4Z";
const Heart = ({ x, y, s = 1, fill = "url(#ge-il-b)" }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d={HEART} fill={fill} />
);
/** Objeto com sombra macia. */
const Obj = ({ children }: { children: ReactNode }) => <g filter="url(#ge-il-drop)">{children}</g>;
const Badge = ({ fill, children }: { fill: string; children: ReactNode }) => (
  <g filter="url(#ge-il-drop)"><circle cx="46" cy="45" r="8.5" fill={fill} stroke="#fff" strokeWidth="2" />{children}</g>
);
const Plus = () => <path d="M46 41v8M42 45h8" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />;
const Cross = () => <path d="M43 42l6 6M49 42l-6 6" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />;

/** Calendário base. */
const Calendar = ({ children }: { children?: ReactNode }) => (
  <Obj>
    <rect x="12" y="17" width="38" height="34" rx="9" fill="url(#ge-il-w)" />
    <path d="M12 26a9 9 0 0 1 9-9h20a9 9 0 0 1 9 9v3H12v-3Z" fill="url(#ge-il-r)" />
    <Gloss d="M17 20.5c4-1.6 18-1.6 26 0" o={0.8} />
    <rect x="20.5" y="12.5" width="4.5" height="9.5" rx="2.25" fill="url(#ge-il-b)" />
    <rect x="37" y="12.5" width="4.5" height="9.5" rx="2.25" fill="url(#ge-il-b)" />
    {children}
  </Obj>
);
const Person = ({ x = 0, fill = "url(#ge-il-r)" }: { x?: number; fill?: string }) => (
  <g transform={`translate(${x} 0)`}>
    <circle cx="29" cy="24" r="9.5" fill={fill} />
    <path d="M12.5 51c0-9.4 7.4-15.5 16.5-15.5S45.5 41.6 45.5 51H12.5Z" fill={fill} />
    <Gloss d="M23.5 20.5c1.2-3 4.5-4.6 7.5-3.8" />
  </g>
);

const ART: Record<IllustrationName, ReactNode> = {
  wallet: (
    <>
      <Obj>
        <path d="M15 22l22.5-7.4a3.2 3.2 0 0 1 4 2.1l1.7 5.3H15Z" fill="url(#ge-il-b)" />
        <rect x="10" y="21" width="42" height="30" rx="9" fill="url(#ge-il-r)" />
        <rect x="35" y="30" width="19" height="12.5" rx="6.25" fill="url(#ge-il-b)" />
        <circle cx="41.5" cy="36.2" r="2.6" fill="url(#ge-il-g)" />
        <Heart x={23} y={38} s={1.25} />
      </Obj>
      <Gloss d="M14 25.5c6-2 18-2.4 26-1.2" />
      <Sparkle x={53} y={14} s={1} />
    </>
  ),
  "calendar-check": (
    <>
      <Calendar><path d="M23.5 38.5l5.2 5.2 10.5-10.5" fill="none" stroke={B2} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></Calendar>
      <Sparkle x={54} y={14} s={1} />
    </>
  ),
  calendar: (
    <Calendar>
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => {
        const on = r === 1 && c === 2;
        return <rect key={`${r}${c}`} x={18.5 + c * 7} y={33 + r * 5.6} width="4.8" height="3.8" rx="1.5" fill={on ? "url(#ge-il-b)" : R2} />;
      }))}
    </Calendar>
  ),
  "calendar-plus": (
    <>
      <Calendar>
        {[[19, 34], [27, 34], [19, 41]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="4" rx="1.5" fill={R2} />)}
      </Calendar>
      <Badge fill="url(#ge-il-b)"><Plus /></Badge>
    </>
  ),
  "calendar-off": (
    <>
      <Calendar>
        {[[19, 34], [27, 34], [35, 34], [19, 41]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="4" rx="1.5" fill={R2} opacity="0.7" />)}
      </Calendar>
      <Badge fill="url(#ge-il-g)"><path d="M42.5 48.5l7-7" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" /></Badge>
    </>
  ),
  clock: (
    <>
      <Obj>
        <circle cx="32" cy="34" r="19" fill="url(#ge-il-r)" />
        <circle cx="32" cy="34" r="13.5" fill="url(#ge-il-w)" />
        <path d="M32 25.5v8.5l6 4" fill="none" stroke={B2} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="34" r="2.2" fill="url(#ge-il-g)" />
      </Obj>
      <Gloss d="M19 26c2.6-5 8-8 13.5-7.6" />
      <Sparkle x={52} y={15} s={1} />
    </>
  ),
  receipt: (
    <>
      <Obj>
        <path d="M18 13h26a2.5 2.5 0 0 1 2.5 2.5V51l-4.7-3.1-4.7 3.1-4.7-3.1-4.7 3.1-4.7-3.1-4.7 3.1-4.7-3.1V15.5A2.5 2.5 0 0 1 18 13Z" fill="url(#ge-il-w)" />
        <rect x="21.5" y="20.5" width="19" height="3.6" rx="1.8" fill={R3} />
        <rect x="21.5" y="27.5" width="12" height="3.6" rx="1.8" fill={R2} />
        <rect x="21.5" y="34.5" width="15" height="3.6" rx="1.8" fill={R2} />
      </Obj>
      <Badge fill="url(#ge-il-g)"><Heart x={46} y={45.5} s={0.72} fill="#fff" /></Badge>
    </>
  ),
  "user-x": (<><Obj><Person /></Obj><Badge fill="url(#ge-il-b)"><Cross /></Badge></>),
  "user-plus": (<><Obj><Person /></Obj><Badge fill="url(#ge-il-g)"><Plus /></Badge><Sparkle x={48} y={15} s={0.9} /></>),
  team: (
    <>
      <Obj>
        <g transform="translate(8 -3) scale(0.86)"><Person fill="url(#ge-il-b)" /></g>
        <g transform="translate(-6 2) scale(0.92)"><Person /></g>
      </Obj>
      <Sparkle x={52} y={14} s={0.9} />
    </>
  ),
  coins: (
    <>
      <Obj>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <ellipse cx="24" cy={47 - i * 6} rx="12" ry="4.8" fill={G3} />
            <ellipse cx="24" cy={45 - i * 6} rx="12" ry="4.8" fill="url(#ge-il-g)" />
          </g>
        ))}
        <circle cx="42" cy="34" r="12" fill="url(#ge-il-r)" />
        <circle cx="42" cy="34" r="8.5" fill="none" stroke="#fff" strokeOpacity="0.6" />
        <Heart x={42} y={35} s={1} />
      </Obj>
      <Gloss d="M35 28c2-2.6 5.5-3.6 8.5-2.8" />
      <Sparkle x={54} y={17} s={0.9} />
    </>
  ),
  lightbulb: (
    <>
      <Obj>
        <path d="M32 11c-8.8 0-14.8 6.5-14.8 14.3 0 5.3 2.7 8.8 5.7 11.6 1.5 1.5 2.2 3.2 2.2 5.2V44h13.8v-1.9c0-2 .7-3.7 2.2-5.2 3-2.8 5.7-6.3 5.7-11.6C46.8 17.5 40.8 11 32 11Z" fill="url(#ge-il-g)" />
        <rect x="24.5" y="45" width="15" height="4.2" rx="2.1" fill="url(#ge-il-b)" />
        <rect x="26.8" y="50.2" width="10.4" height="3.6" rx="1.8" fill="url(#ge-il-b)" />
      </Obj>
      <Gloss d="M24 21c1.6-3.6 4.8-5.6 8.6-5.8" o={0.85} />
      <Sparkle x={51} y={15} s={1.1} />
      <Sparkle x={13} y={22} s={0.65} />
    </>
  ),
  chart: (
    <>
      <Obj>
        <rect x="12.5" y="34" width="10" height="17" rx="4" fill="url(#ge-il-r)" />
        <rect x="27" y="25" width="10" height="26" rx="4" fill="url(#ge-il-b)" />
        <rect x="41.5" y="16" width="10" height="35" rx="4" fill="url(#ge-il-g)" />
      </Obj>
      <Gloss d="M14.5 37v6M29 28v8M43.5 19v9" o={0.6} />
      <path d="M14 28l13-9 9 4 12-10" fill="none" stroke={B2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <Sparkle x={54} y={10} s={0.9} />
    </>
  ),
  heart: (
    <>
      <Obj><Heart x={32} y={35} s={3.6} fill="url(#ge-il-r)" /></Obj>
      <Gloss d="M18.5 25c1.4-4 5.6-5.8 9-4.4" o={0.85} />
      <Sparkle x={51} y={14} s={1.1} />
      <Sparkle x={13} y={46} s={0.6} />
    </>
  ),
  gift: (
    <>
      <Obj>
        <rect x="14" y="28" width="36" height="23" rx="5" fill="url(#ge-il-r)" />
        <rect x="11.5" y="22" width="41" height="9" rx="4" fill="url(#ge-il-r)" />
        <rect x="29" y="22" width="6" height="29" fill="url(#ge-il-b)" />
        <path d="M32 22c-3-6-11-8-11-3s8 3 11 3Zm0 0c3-6 11-8 11-3s-8 3-11 3Z" fill="url(#ge-il-g)" />
      </Obj>
      <Gloss d="M15 24.5h12" />
      <Sparkle x={53} y={14} s={1} />
    </>
  ),
  sparkles: (
    <>
      <Obj>
        <Sparkle x={28} y={34} s={3.4} fill="url(#ge-il-r)" />
        <Sparkle x={45} y={19} s={1.8} fill="url(#ge-il-g)" />
        <Sparkle x={46} y={45} s={1.2} fill="url(#ge-il-b)" />
      </Obj>
      <Gloss d="M24.5 27c1-2.4 2-3.6 3.4-4" o={0.8} />
    </>
  ),
  scissors: (
    <>
      <Obj>
        <path d="M27 31L48 13M37 31L16 13" stroke="url(#ge-il-steel)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="22" cy="42" r="8" fill="none" stroke="url(#ge-il-r)" strokeWidth="5.5" />
        <circle cx="42" cy="42" r="8" fill="none" stroke="url(#ge-il-b)" strokeWidth="5.5" />
        <circle cx="32" cy="30" r="2.6" fill="url(#ge-il-g)" />
      </Obj>
      <Gloss d="M17 37c1.6-2 3.4-2.8 5.4-2.6" />
      <Sparkle x={53} y={24} s={0.9} />
    </>
  ),
  chat: (
    <>
      <Obj>
        <path d="M14 18a8 8 0 0 1 8-8h22a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H27l-8 7v-7.4A8 8 0 0 1 14 33V18Z" fill="url(#ge-il-r)" />
        {[24, 33, 42].map((x) => <circle key={x} cx={x} cy="25.5" r="2.6" fill="#fff" />)}
      </Obj>
      <Gloss d="M18.5 15c5-2 18-2 25 0" />
      <Obj><Heart x={47} y={47} s={1.3} /></Obj>
    </>
  ),
  shield: (
    <>
      <Obj>
        <path d="M32 10l17 6.5v12.8c0 11-7.4 18.6-17 22.2-9.6-3.6-17-11.2-17-22.2V16.5L32 10Z" fill="url(#ge-il-r)" />
        <path d="M24.5 31l5.3 5.3L40 26" fill="none" stroke={B2} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      </Obj>
      <Gloss d="M20 19.5c4-2 8-3.4 12-4.4" o={0.85} />
      <Sparkle x={52} y={13} s={0.9} />
    </>
  ),
  store: (
    <>
      <Obj>
        <rect x="14" y="28" width="36" height="23" rx="4" fill="url(#ge-il-w)" />
        <path d="M12 21l4-8h32l4 8v3.5a5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0V21Z" fill="url(#ge-il-r)" />
        <path d="M22 13l-2 11.5M32 13v11.5M42 13l2 11.5" stroke="#fff" strokeWidth="2.2" opacity="0.8" />
        <rect x="27" y="36" width="10" height="15" rx="2.5" fill="url(#ge-il-b)" />
        <Heart x={20.5} y={37} s={0.8} fill={R3} />
      </Obj>
      <Sparkle x={54} y={12} s={0.9} />
    </>
  ),
  notebook: (
    <>
      <Obj>
        <rect x="15" y="11" width="31" height="41" rx="6" fill="url(#ge-il-r)" />
        <rect x="21" y="18" width="19" height="3.4" rx="1.7" fill="#fff" opacity="0.85" />
        <rect x="21" y="24.5" width="13" height="3.4" rx="1.7" fill="#fff" opacity="0.7" />
        <Heart x={30.5} y={38} s={1.25} />
        <path d="M44 51l9-24" stroke="url(#ge-il-g)" strokeWidth="4.5" strokeLinecap="round" />
      </Obj>
      <Gloss d="M18.5 15v32" o={0.5} />
    </>
  ),
  bell: (
    <>
      <Obj>
        <path d="M32 12a3 3 0 0 1 3 3v1.3c6.4 1.4 10.5 6.8 10.5 13.6v7.6l3.5 5.2H15l3.5-5.2v-7.6c0-6.8 4.1-12.2 10.5-13.6V15a3 3 0 0 1 3-3Z" fill="url(#ge-il-g)" />
        <circle cx="32" cy="47.5" r="4.4" fill="url(#ge-il-b)" />
      </Obj>
      <Gloss d="M23.5 25c1.4-3.4 4.4-5.4 7.6-5.6" o={0.85} />
      <Sparkle x={51} y={15} s={1} />
    </>
  ),
  link: (
    <>
      <Obj>
        <rect x="9.5" y="25" width="27" height="15" rx="7.5" transform="rotate(-35 23 32.5)" fill="none" stroke="url(#ge-il-r)" strokeWidth="6" />
        <rect x="27.5" y="25" width="27" height="15" rx="7.5" transform="rotate(-35 41 32.5)" fill="none" stroke="url(#ge-il-b)" strokeWidth="6" />
      </Obj>
      <Sparkle x={52} y={13} s={1} />
    </>
  ),
  star: (
    <>
      <Obj><path d="M32 11l6.2 12.6 13.9 2-10 9.8 2.4 13.8L32 42.7l-12.5 6.5 2.4-13.8-10-9.8 13.9-2L32 11Z" fill="url(#ge-il-g)" strokeLinejoin="round" /></Obj>
      <Gloss d="M27 24c1.4-2.4 3-4.4 4.6-6" o={0.85} />
      <Sparkle x={52} y={44} s={0.8} fill="url(#ge-il-r)" />
    </>
  ),
};

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-12 w-12 shrink-0 overflow-visible", className)} aria-hidden focusable="false">
      <Defs />
      <circle cx="32" cy="34" r="30" fill="url(#ge-il-halo)" />
      {ART[name]}
    </svg>
  );
}
