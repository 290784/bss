import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-ink-warm p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-[#813afc]/35 blur-[90px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-[#e0457b]/25 blur-[90px]" aria-hidden />
        <Logo href="/" className="relative [&_span]:text-white" />
        <div className="relative max-w-md">
          <p className="font-tight text-[38px] leading-[1.12] font-extrabold tracking-[-0.025em]">
            Menos tempo administrando, menos horários perdidos e <span className="text-halo-lavender">mais clientes voltando</span>.
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-white/65">Agenda, clientes e agendamento online em um só lugar, feito para o dia a dia de quem trabalha com beleza.</p>
        </div>
        <p className="relative text-xs text-white/50">Teste grátis por 14 dias. Sem cartão de crédito.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
