import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAppContext, tenant, trialDaysLeft } from "@/server/context";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { can, ROLE_LABEL } from "@/domain/permissions";
import { listNotifications } from "@/server/modules/notifications";
import { DemoBanner } from "@/components/ui/primitives";
import { ToastProvider } from "@/components/ui/toast";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppContext();
  const notifications = await tenant(ctx, (tx) => listNotifications(tx, ctx.org.id, ctx.user.userId));
  const items = NAV_ITEMS.filter((i) => !i.permission || can(ctx.role, i.permission));
  const trialDays = trialDaysLeft(ctx.subscription);

  let banner: React.ReactNode = null;
  if (ctx.org.isDemo) banner = <DemoBanner />;
  else if (ctx.access === "read_only")
    banner = <div className="bg-st-noshow-bg px-4 py-2 text-center text-[13px] text-st-noshow">Assinatura inativa: seus dados estão preservados e disponíveis para consulta e exportação, mas novas alterações estão bloqueadas.</div>;
  else if (ctx.access === "grace")
    banner = <div className="bg-st-pending-bg px-4 py-2 text-center text-[13px] text-st-pending">Há um pagamento pendente na assinatura. Regularize para evitar o modo somente leitura.</div>;
  else if (trialDays !== null && trialDays <= 5 && can(ctx.role, "billing.manage"))
    banner = <div className="bg-highlight-subtle px-4 py-2 text-center text-[13px] text-highlight-text">Seu teste termina em {trialDays} dia(s). <Link className="font-medium underline" href="/app/configuracoes#assinatura">Ver planos</Link></div>;

  return (
    <ToastProvider>
      <AppShell
        items={items}
        user={{ name: ctx.user.fullName, email: ctx.user.email, roleLabel: ROLE_LABEL[ctx.role] }}
        org={{ id: ctx.org.id, name: ctx.org.name, slug: ctx.org.slug }}
        memberships={ctx.memberships}
        notifications={notifications.map((n) => ({
          id: n.id, title: n.title, body: n.body, link: n.link, read: n.read_at !== null,
          when: formatDistanceToNow(n.created_at, { addSuffix: true, locale: ptBR }),
        }))}
        banner={banner}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
