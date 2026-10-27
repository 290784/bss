/**
 * Planos são hipóteses comerciais (preços não definidos). Limites e recursos ficam
 * em dados, não espalhados em `if`s — permite experimentar sem mexer em autorização.
 */
export type PlanId = "solo" | "pro" | "studio" | "business";
export type Feature = "online_booking" | "automations" | "multi_professional" | "multi_unit" | "reports_advanced";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  maxProfessionals: number;
  maxUnits: number;
  features: Feature[];
};

export const PLANS: Record<PlanId, Plan> = {
  solo: {
    id: "solo", name: "Solo", tagline: "Para quem atende sozinha",
    maxProfessionals: 1, maxUnits: 1, features: ["online_booking"],
  },
  pro: {
    id: "pro", name: "Pro", tagline: "Mais automações para crescer",
    maxProfessionals: 2, maxUnits: 1, features: ["online_booking", "automations"],
  },
  studio: {
    id: "studio", name: "Studio", tagline: "Para equipes",
    maxProfessionals: 10, maxUnits: 1, features: ["online_booking", "automations", "multi_professional", "reports_advanced"],
  },
  business: {
    id: "business", name: "Business", tagline: "Várias unidades",
    maxProfessionals: 100, maxUnits: 20,
    features: ["online_booking", "automations", "multi_professional", "multi_unit", "reports_advanced"],
  },
};

export const TRIAL_DAYS = 14;
export const PLAN_DURING_TRIAL: PlanId = "studio";

export type SubscriptionState = {
  plan: PlanId;
  status: "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: Date | null;
  graceUntil: Date | null;
};

/**
 * Acesso efetivo. Bloqueio gradual e previsível, nunca apaga dados:
 * - full: tudo do plano;
 * - grace: inadimplente dentro da tolerância — funciona, com aviso;
 * - read_only: pode consultar e exportar, não cria novos agendamentos;
 */
export type Access = "full" | "grace" | "read_only";

export function effectiveAccess(s: SubscriptionState, now: Date): Access {
  switch (s.status) {
    case "active":
      return "full";
    case "trialing":
      return s.trialEndsAt && s.trialEndsAt > now ? "full" : "read_only";
    case "past_due":
      return s.graceUntil && s.graceUntil > now ? "grace" : "read_only";
    case "canceled":
      return "read_only";
  }
}

export function effectivePlan(s: SubscriptionState, now: Date): Plan {
  if (s.status === "trialing" && s.trialEndsAt && s.trialEndsAt > now) return PLANS[PLAN_DURING_TRIAL];
  return PLANS[s.plan];
}

export function canWrite(s: SubscriptionState, now: Date): boolean {
  return effectiveAccess(s, now) !== "read_only";
}
