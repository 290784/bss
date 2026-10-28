import type { DiaSemana, Faixa } from "@/data/types";

export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

/** Dia da semana e "HH:MM" de um instante no fuso informado (ex.: America/Sao_Paulo). */
export function agoraNoFuso(instante: Date, fuso: string): { dia: DiaSemana; hhmm: string } {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: fuso, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(instante);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")) as DiaSemana;
  return { dia, hhmm: `${get("hour")}:${get("minute")}` };
}

export type Situacao = {
  aberto: boolean;
  hoje: DiaSemana;
  /** Faixa de hoje, se o studio abre hoje. */
  faixaHoje?: Faixa;
  /** Próxima abertura (hoje mais tarde ou em outro dia), quando fechado. */
  proxima?: Faixa;
};

/** Aberto de "abre" (inclusive) até "fecha" (exclusive), no fuso do studio. */
export function situacao(faixas: Faixa[], fuso: string, instante = new Date()): Situacao {
  const { dia, hhmm } = agoraNoFuso(instante, fuso);
  const hoje = faixas.filter((f) => f.dia === dia);
  const aberta = hoje.find((f) => f.abre <= hhmm && hhmm < f.fecha);
  if (aberta) return { aberto: true, hoje: dia, faixaHoje: aberta };
  const maisTarde = hoje.filter((f) => hhmm < f.abre).sort((a, b) => a.abre.localeCompare(b.abre))[0];
  if (maisTarde) return { aberto: false, hoje: dia, faixaHoje: hoje[0], proxima: maisTarde };
  for (let i = 1; i <= 7; i++) {
    const d = ((dia + i) % 7) as DiaSemana;
    const f = faixas.filter((x) => x.dia === d).sort((a, b) => a.abre.localeCompare(b.abre))[0];
    if (f) return { aberto: false, hoje: dia, faixaHoje: hoje[0], proxima: f };
  }
  return { aberto: false, hoje: dia, faixaHoje: hoje[0] };
}

/** "9h", "19h30" */
export function hora(hhmm: string) {
  const [h, m] = hhmm.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** Agrupa dias consecutivos com o mesmo horário: "Terça a Sexta · 09:00–19:30". */
export function resumoSemana(faixas: Faixa[]): { dias: string; horario: string; inclui: DiaSemana[] }[] {
  const ordem: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
  const porDia = new Map(ordem.map((d) => [d, faixas.filter((f) => f.dia === d).map((f) => `${f.abre}–${f.fecha}`).join(", ")]));
  const grupos: { dias: DiaSemana[]; horario: string }[] = [];
  for (const d of ordem) {
    const h = porDia.get(d)!;
    if (!h) continue;
    const ultimo = grupos.at(-1);
    const anterior = ordem[ordem.indexOf(d) - 1];
    if (ultimo && ultimo.horario === h && ultimo.dias.at(-1) === anterior) ultimo.dias.push(d);
    else grupos.push({ dias: [d], horario: h });
  }
  return grupos.map((g) => ({
    dias: g.dias.length > 1 ? `${NOMES_DIAS[g.dias[0]!]} a ${NOMES_DIAS[g.dias.at(-1)!]}` : NOMES_DIAS[g.dias[0]!],
    horario: g.horario,
    inclui: g.dias,
  }));
}
