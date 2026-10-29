"use client";
import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * "Gê" na cursiva da marca (contornos da Allura), escrito à mão ao abrir a página: primeiro o G,
 * o ê começa antes de o G terminar e o acento vem por último. Cada contorno é revelado por um
 * traço grosso em máscara (stroke-dashoffset com pathLength=1), só com CSS. Com "reduzir
 * movimento" aparece pronto. Herda a cor do texto (currentColor) e o tamanho da fonte (em).
 */
const TRACOS = [
  { d: "M282 -370Q246 -370 224.5 -350Q203 -330 203 -296Q203 -269 218 -235.5Q233 -202 266 -165Q334 -87 417.5 -37Q501 13 597 44Q611 82 623 121.5Q635 161 647 201Q598 155 539 109.5Q480 64 414 33.5Q348 3 277 3Q225 3 178.5 22.5Q132 42 103 82Q74 122 74 185Q74 340 212 464Q292 537 386.5 569.5Q481 602 586 602Q598 602 620.5 599.5Q643 597 667 589.5Q691 582 709 568.5Q727 555 730 534Q731 530 731 527Q731 524 731 521Q731 509 727 503Q723 497 718 497Q708 497 708 513Q706 540 690.5 554.5Q675 569 652.5 574Q630 579 607 579Q570 579 518.5 563.5Q467 548 410 520.5Q353 493 297.5 455.5Q242 418 197 373.5Q152 329 125 280Q98 231 98 181Q98 112 143.5 81.5Q189 51 259 51Q327 51 403 75Q460 92 501 117.5Q542 143 579 176.5Q616 210 658 250Q676 296 705 309Q734 322 759 322Q773 322 784 320Q795 318 799 318Q807 317 807 312Q807 303 795 305Q764 307 741 276.5Q718 246 704 204Q691 169 679 132Q667 95 653 58Q704 72 729 72Q741 72 745 69Q749 66 749 61Q749 52 742 55Q736 57 729 57Q716 57 696 52.5Q676 48 660 41Q644 34 640 24Q597 -85 549 -160Q501 -235 452.5 -281.5Q404 -328 360 -349Q316 -370 282 -370Z", x: 0, y: 0, atraso: 0, dur: 1086 },
  { d: "M310 -344Q347 -344 383 -315.5Q419 -287 452.5 -242Q486 -197 513.5 -146Q541 -95 561 -49Q581 -3 591 25Q509 -2 439 -47Q369 -92 314 -160Q284 -197 270.5 -229Q257 -261 257 -286Q257 -313 271.5 -328.5Q286 -344 310 -344Z", x: 0, y: 0, atraso: 1086, dur: 214 },
  { d: "M131 -15Q86 -15 53 6Q20 27 20 70Q20 93 34 126Q44 149 71 179Q98 209 134 237.5Q170 266 207 284.5Q244 303 274 303Q285 303 294 300Q311 294 317.5 281Q324 268 324 254Q324 241 320 229Q316 217 310 208Q292 181 258.5 160Q225 139 190.5 127Q156 115 134 113H132Q119 113 119 121Q119 126 127 126Q151 128 187.5 148.5Q224 169 252 191Q264 201 280.5 219Q297 237 297 254Q297 272 280 272Q271 272 261.5 268Q252 264 246 262Q217 248 182 218.5Q147 189 118.5 152.5Q90 116 79 79Q76 71 75 63.5Q74 56 74 49Q74 25 89.5 15Q105 5 127 5Q160 5 195 19.5Q230 34 263 57Q296 80 323.5 106.5Q351 133 370 158Q373 162 377 162.5Q381 163 382 161Q386 160 386 155.5Q386 151 384 147Q356 108 316.5 71Q277 34 229.5 9.5Q182 -15 131 -15Z", x: 798, y: 0, atraso: 1000, dur: 900 },
  { d: "M219 807Q227 807 236.5 788.5Q246 770 254 748Q262 726 266 716Q268 707 268.5 703Q269 699 269 695Q268 685 260 683Q253 688 241.5 704.5Q230 721 218 739Q206 757 200 767Q183 757 159 738Q135 719 113.5 703.5Q92 688 83 688Q79 688 79 692Q80 699 95 711Q105 720 123.5 736Q142 752 162 768.5Q182 785 198 796Q214 807 219 807Z", x: 908, y: -329, atraso: 1950, dur: 300 },
];

export function GeEscrito({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="34 -642 1190 1052" className={cn("inline-block h-[1.052em] w-[1.19em] overflow-visible", className)} aria-hidden>
      <g transform="scale(1,-1)">
        {TRACOS.map((t, i) => (
          <g key={i} transform={`translate(${t.x},${t.y})`}>
            <mask id={`ge${id}${i}`} maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
              <path d={t.d} pathLength={1} fill="none" stroke="#fff" strokeWidth={120} strokeLinecap="round" strokeLinejoin="round"
                className="ge-traco" style={{ animationDelay: `${t.atraso}ms`, animationDuration: `${t.dur}ms` }} />
            </mask>
            <path d={t.d} fill="currentColor" mask={`url(#ge${id}${i})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
