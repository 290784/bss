/**
 * Fundo vivo do BSS (igual ao app): brilhos difusos rosa e lilás, fitas de neon com volume (halo + núcleo +
 * reflexo) e estrelinhas cintilando. Puramente decorativo, fixo atrás do conteúdo, sem eventos
 * de toque; as cores vêm do tema (claro/escuro). Só opacidade e transform animam (leve no celular).
 */
import { bss } from "@/theme/tokens";

const RIBBONS = [
  "M -120 250 C 220 110, 430 430, 760 300 S 1230 110, 1580 250",
  "M -100 770 C 250 640, 520 880, 870 720 S 1310 560, 1560 690",
  "M 1040 -60 C 1150 150, 1360 210, 1520 110",
];

// [x, y, tamanho, atraso em s]
const SPARKS: [number, number, number, number][] = [
  [140, 120, 14, 0], [380, 520, 9, 1.4], [620, 180, 11, 2.6], [910, 430, 8, 0.8], [1180, 300, 13, 3.2],
  [1330, 640, 10, 1.9], [260, 820, 12, 2.2], [760, 690, 9, 3.8], [1040, 820, 11, 0.4], [1400, 90, 8, 2.9],
  [520, 360, 7, 4.1], [60, 470, 9, 3.4],
];
const star = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} C ${x + r * 0.16} ${y - r * 0.16}, ${x + r * 0.16} ${y - r * 0.16}, ${x + r} ${y} C ${x + r * 0.16} ${y + r * 0.16}, ${x + r * 0.16} ${y + r * 0.16}, ${x} ${y + r} C ${x - r * 0.16} ${y + r * 0.16}, ${x - r * 0.16} ${y + r * 0.16}, ${x - r} ${y} C ${x - r * 0.16} ${y - r * 0.16}, ${x - r * 0.16} ${y - r * 0.16}, ${x} ${y - r} Z`;

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      {/* Orbes sempre dentro da tela: no iPhone, algo além da borda (mesmo numa camada fixa) faz o
          Safari reduzir a página inteira e ela fica descentralizada. O desfoque já espalha a cor. */}
      <span className="orb" style={{ width: "min(520px, 70vw)", height: "min(520px, 70vw)", top: 0, right: 0, background: "radial-gradient(circle, rgb(236 92 190 / 0.55), transparent 70%)" }} />
      <span className="orb" style={{ width: "min(460px, 62vw)", height: "min(460px, 62vw)", top: "30%", left: 0, background: "radial-gradient(circle, rgb(171 61 245 / 0.55), transparent 70%)", animationDelay: "-5s" }} />
      <span className="orb" style={{ width: "min(560px, 75vw)", height: "min(560px, 75vw)", bottom: 0, left: "25%", background: "radial-gradient(circle, rgb(213 158 250 / 0.45), transparent 70%)", animationDelay: "-9s" }} />
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="amb-rib" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: "var(--rib-a)", stopOpacity: 0 }} />
            <stop offset="0.25" style={{ stopColor: "var(--rib-a)" }} />
            <stop offset="0.6" style={{ stopColor: "var(--rib-b)" }} />
            <stop offset="0.85" style={{ stopColor: "var(--rib-c)" }} />
            <stop offset="1" style={{ stopColor: "var(--rib-c)", stopOpacity: 0 }} />
          </linearGradient>
          <filter id="amb-glow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        {RIBBONS.map((d, i) => (
          <g key={i} fill="none" strokeLinecap="round">
            {/* halo (neon), núcleo colorido e reflexo fino deslocado: dá a sensação de tubo em 3D */}
            <path d={d} stroke="url(#amb-rib)" strokeWidth={i === 2 ? 16 : 26} filter="url(#amb-glow)" style={{ opacity: "var(--rib-glow)" }} />
            <path d={d} stroke="url(#amb-rib)" strokeWidth={i === 2 ? 2 : 3} style={{ opacity: "var(--rib-core)" }} />
            <path d={d} stroke={bss.sobreMarca} strokeWidth={0.9} transform="translate(0 -1.5)" style={{ opacity: 0.45 }} />
          </g>
        ))}
        {SPARKS.map(([x, y, r, delay], i) => (
          <path key={i} className="tw" d={star(x, y, r)} style={{ fill: "var(--spark)", animationDelay: `${delay}s` }} />
        ))}
      </svg>
    </div>
  );
}
