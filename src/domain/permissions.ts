export const ROLES = ["owner", "manager", "receptionist", "professional"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Proprietária",
  manager: "Gerente",
  receptionist: "Recepção",
  professional: "Profissional",
};

export type Permission =
  | "dashboard.view"
  | "agenda.view_all"
  | "agenda.manage"
  | "clients.view"
  | "clients.manage"
  | "clients.view_internal_notes"
  | "clients.delete"
  | "services.manage"
  | "team.manage"
  | "finance.view"
  | "finance.record"
  | "settings.manage"
  | "billing.manage"
  | "audit.view";

const MATRIX: Record<Role, Permission[]> = {
  owner: [
    "dashboard.view", "agenda.view_all", "agenda.manage", "clients.view", "clients.manage",
    "clients.view_internal_notes", "clients.delete", "services.manage", "team.manage",
    "finance.view", "finance.record", "settings.manage", "billing.manage", "audit.view",
  ],
  manager: [
    "dashboard.view", "agenda.view_all", "agenda.manage", "clients.view", "clients.manage",
    "clients.view_internal_notes", "clients.delete", "services.manage", "team.manage",
    "finance.view", "finance.record", "settings.manage", "audit.view",
  ],
  receptionist: [
    "agenda.view_all", "agenda.manage", "clients.view", "clients.manage",
    "clients.view_internal_notes", "finance.record", "finance.view",
  ],
  professional: ["agenda.manage", "clients.view"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}
