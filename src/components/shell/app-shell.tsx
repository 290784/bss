"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, CalendarDays, ChevronsUpDown, Home, LogOut, Menu, Scissors, Search, Settings, Users, UsersRound, X, ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { NavItem } from "./nav-items";
import { markNotificationsRead, switchOrganization } from "@/app/app/shell-actions";

const ICONS = { home: Home, calendar: CalendarDays, users: Users, scissors: Scissors, team: UsersRound, settings: Settings };

export type ShellProps = {
  items: NavItem[];
  user: { name: string; email: string; roleLabel: string };
  org: { id: string; name: string; slug: string };
  memberships: { organizationId: string; name: string }[];
  notifications: { id: string; title: string; body: string | null; link: string | null; read: boolean; when: string }[];
  banner?: React.ReactNode;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function AppShell({ items, user, org, memberships, notifications, banner, children }: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-dvh">
      {banner}
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface/60 px-3 py-5 lg:flex">
          <div className="px-2"><Logo href="/app" /></div>
          <OrgSwitcher org={org} memberships={memberships} />
          <nav className="mt-2 flex flex-col gap-0.5" aria-label="Principal">
            {items.map((it) => <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />)}
          </nav>
          <div className="mt-auto space-y-1">
            <a href={`/b/${org.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-sunken hover:text-ink">
              <ExternalLink className="h-4 w-4" /> Minha página de agendamento
            </a>
            <UserBlock user={user} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
            <button className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-sunken lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden"><Logo href="/app" className="[&_span]:hidden sm:[&_span]:inline" /></div>
            <form action="/app/clientes" className="relative ml-auto w-full max-w-md lg:ml-0" role="search">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input name="q" placeholder="Buscar cliente por nome, telefone ou e-mail" aria-label="Buscar clientes"
                className="h-10 w-full rounded-[10px] border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-muted focus:outline-none" />
            </form>
            <ThemeToggle />
            <Notifications key={notifications.map((n) => n.id + n.read).join()} items={notifications} />
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-12">{children}</main>
        </div>
      </div>

      {/* Navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegação rápida">
        {items.filter((i) => i.mobile).slice(0, 3).map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(pathname, it.href);
          return (
            <Link key={it.href} href={it.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent-text" : "text-muted")} aria-current={active ? "page" : undefined}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />{it.label}
            </Link>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted">
          <Menu className="h-5 w-5" strokeWidth={1.8} />Mais
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-night/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-surface px-3 py-5 shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between px-2">
              <Logo href="/app" />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted hover:bg-sunken" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <OrgSwitcher org={org} memberships={memberships} />
            <nav className="mt-2 flex flex-col gap-0.5" onClick={() => setMobileOpen(false)}>
              {items.map((it) => <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />)}
            </nav>
            <div className="mt-auto space-y-1">
              <a href={`/b/${org.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-sunken">
                <ExternalLink className="h-4 w-4" /> Minha página de agendamento
              </a>
              <UserBlock user={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-accent-subtle font-medium text-accent-text" : "text-ink-soft hover:bg-sunken hover:text-ink")}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.8} />
      {item.label}
    </Link>
  );
}

function OrgSwitcher({ org, memberships }: { org: ShellProps["org"]; memberships: ShellProps["memberships"] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (memberships.length <= 1)
    return <div className="mx-1 mt-5 mb-2 truncate rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink">{org.name}</div>;
  return (
    <label className="relative mx-1 mt-5 mb-2 block">
      <span className="sr-only">Organização</span>
      <select value={org.id} disabled={pending}
        onChange={(e) => start(async () => { await switchOrganization(e.target.value); router.refresh(); })}
        className="w-full appearance-none truncate rounded-lg border border-line bg-surface py-2 pr-8 pl-3 text-[13px] font-medium text-ink">
        {memberships.map((m) => <option key={m.organizationId} value={m.organizationId}>{m.name}</option>)}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </label>
  );
}

function UserBlock({ user }: { user: ShellProps["user"] }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border-t border-line px-2 pt-3">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted">{user.roleLabel}</div>
      </div>
      <form action="/sair" method="post">
        <button className="rounded-lg p-2 text-muted hover:bg-sunken hover:text-ink" aria-label="Sair" title="Sair"><LogOut className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function Notifications({ items }: { items: ShellProps["notifications"] }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(items);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => {
        setOpen(!open);
        if (!open && unread) { markNotificationsRead(); setList((l) => l.map((n) => ({ ...n, read: true }))); }
      }} className="relative rounded-lg p-2 text-ink-soft hover:bg-sunken" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notificações</div>
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nada por aqui. Avisaremos quando chegar um agendamento online.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {list.map((n) => (
                <li key={n.id}>
                  <Link href={n.link ?? "#"} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-sunken">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-[13px] text-ink-soft">{n.body}</div>}
                    <div className="mt-1 text-xs text-muted">{n.when}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
