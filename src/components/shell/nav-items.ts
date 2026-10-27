import type { Permission } from "@/domain/permissions";

export type NavItem = { href: string; label: string; icon: "home" | "calendar" | "users" | "scissors" | "team" | "settings"; permission?: Permission; mobile?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Início", icon: "home", permission: "dashboard.view", mobile: true },
  { href: "/app/agenda", label: "Agenda", icon: "calendar", mobile: true },
  { href: "/app/clientes", label: "Clientes", icon: "users", permission: "clients.view", mobile: true },
  { href: "/app/servicos", label: "Serviços", icon: "scissors", permission: "services.manage" },
  { href: "/app/equipe", label: "Equipe e horários", icon: "team", permission: "team.manage" },
  { href: "/app/configuracoes", label: "Configurações", icon: "settings", permission: "settings.manage" },
];
