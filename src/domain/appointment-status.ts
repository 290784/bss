export const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Falta",
};

/**
 * Fluxo permitido. Estados finais (cancelado) não voltam; concluído e falta podem
 * ser corrigidos entre si ou voltar a confirmado (erro de lançamento), sempre com histórico.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "completed", "cancelled", "no_show"],
  completed: ["confirmed", "no_show"],
  no_show: ["confirmed", "completed"],
  cancelled: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[from];
}

/** Estados que ocupam a agenda (espelha a restrição appointments_no_overlap). */
export function occupiesSlot(s: AppointmentStatus): boolean {
  return s === "pending" || s === "confirmed" || s === "completed";
}

/** Reagendar só faz sentido para atendimentos que ainda não aconteceram. */
export function canReschedule(s: AppointmentStatus): boolean {
  return s === "pending" || s === "confirmed";
}
