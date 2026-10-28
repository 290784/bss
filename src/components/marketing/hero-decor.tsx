/**
 * Decoração do hero da landing creme: arcos finos (violeta e dourado) e ondas sobrepostas
 * no rodapé (lilás + champanhe com um filete dourado). Só decoração, atrás do conteúdo.
 */
export function HeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="absolute -top-10 left-0 h-[420px] w-[320px] sm:w-[420px]" viewBox="0 0 420 420" fill="none">
        <path d="M -40 300 C 80 290 200 200 250 0" stroke="url(#hd-violeta)" strokeWidth="1.6" />
        <path d="M -40 360 C 120 350 260 250 330 0" stroke="url(#hd-ouro)" strokeWidth="1.2" />
        <defs>
          <linearGradient id="hd-violeta" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#780ac2" /><stop offset="1" stopColor="#d59efa" stopOpacity="0.2" /></linearGradient>
          <linearGradient id="hd-ouro" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#c6a05b" /><stop offset="1" stopColor="#e3c88f" stopOpacity="0.2" /></linearGradient>
        </defs>
      </svg>
      <svg className="absolute top-6 right-[-6%] hidden h-[560px] w-[620px] lg:block" viewBox="0 0 620 560" fill="none">
        <path d="M 40 560 C 0 300 160 40 420 30 C 520 26 590 60 640 110" stroke="#c6a05b" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>
      <svg className="absolute inset-x-0 bottom-0 h-[180px] w-full sm:h-[220px]" viewBox="0 0 1440 220" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="hd-lilas" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e9d3fb" /><stop offset="0.5" stopColor="#f4e8fd" stopOpacity="0.6" /><stop offset="1" stopColor="#cf9df5" /></linearGradient>
          <linearGradient id="hd-champ" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d9b878" /><stop offset="0.45" stopColor="#f6ead2" /><stop offset="1" stopColor="#e9d3fb" stopOpacity="0.8" /></linearGradient>
          <linearGradient id="hd-filete" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c6a05b" /><stop offset="1" stopColor="#c6a05b" stopOpacity="0.2" /></linearGradient>
        </defs>
        <path d="M0 70 C 260 10 480 150 760 110 S 1200 30 1440 90 V 220 H 0 Z" fill="url(#hd-lilas)" opacity="0.8" />
        <path d="M0 140 C 300 70 560 200 860 150 S 1260 100 1440 150 V 220 H 0 Z" fill="url(#hd-champ)" opacity="0.9" />
        <path d="M0 132 C 300 62 560 192 860 142 S 1260 92 1440 142" stroke="url(#hd-filete)" strokeWidth="1.5" />
        <path d="M0 190 C 360 150 700 230 1040 190 S 1360 170 1440 180 V 220 H 0 Z" fill="#fbf5ec" opacity="0.85" />
      </svg>
    </div>
  );
}
