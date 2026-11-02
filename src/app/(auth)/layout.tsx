import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative m-4 hidden overflow-hidden rounded-[32px] border border-accent-muted/70 auth-panel p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo href="/" className="relative" />
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
        <div className="flex items-center justify-between"><div className="lg:invisible"><Logo /></div><ThemeToggle /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rounded-[28px] sm:border sm:border-line/70 sm:bg-surface sm:p-9 sm:shadow-[var(--shadow-card)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
