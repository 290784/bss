import { Logo } from "@/components/brand/logo";
import { Illustration } from "@/components/ui/illustration";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-app className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative m-4 hidden overflow-hidden rounded-[32px] border border-accent-muted/70 auth-panel p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo href="/" className="relative" />
        {/* Composição de ilustrações (decorativa). */}
        <div aria-hidden className="pointer-events-none absolute top-16 right-10 h-72 w-72">
          <Illustration name="calendar-check" className="absolute top-6 right-16 h-36 w-36 rotate-[-6deg]" />
          <Illustration name="heart" className="absolute top-0 right-0 h-20 w-20 rotate-[10deg]" />
          <Illustration name="coins" className="absolute top-40 right-2 h-24 w-24" />
          <Illustration name="sparkles" className="absolute top-36 right-40 h-20 w-20" />
        </div>
        <div className="relative max-w-md">
          <span className="mb-6 block h-px w-12 bg-highlight-border" aria-hidden />
          <p className="font-serif text-[38px] leading-[1.12] font-semibold tracking-[-0.01em] text-ink">
            Menos tempo administrando, menos horários perdidos e <span className="font-script text-[1.35em] font-normal tracking-normal text-accent-text">mais clientes voltando</span>.
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">Agenda, clientes e agendamento online em um só lugar, feito para o dia a dia de quem trabalha com beleza.</p>
        </div>
        <p className="relative text-xs text-muted">Teste grátis por 14 dias. Sem cartão de crédito.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="flex items-center justify-between"><div className="lg:invisible"><Logo /></div></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rounded-[28px] sm:border sm:border-gold-line/40 sm:bg-surface sm:p-9 sm:shadow-[var(--shadow-card)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
