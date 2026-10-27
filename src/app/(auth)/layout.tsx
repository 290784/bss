import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-plum-900 p-12 text-champagne-100 lg:flex lg:flex-col lg:justify-between">
        <Logo href="/" className="[&_span]:text-champagne-100" />
        <div className="max-w-md">
          <p className="font-display text-[34px] leading-[1.15] font-light">
            Menos tempo administrando, menos horários perdidos e <em className="text-champagne-300">mais clientes voltando</em>.
          </p>
          <p className="mt-6 text-sm text-plum-200">Agenda, clientes e agendamento online em um só lugar — feito para o dia a dia de quem trabalha com beleza.</p>
        </div>
        <p className="text-xs text-plum-200/70">Teste grátis por 14 dias. Sem cartão de crédito.</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full border border-plum-700" aria-hidden />
        <div className="pointer-events-none absolute -right-8 -bottom-8 h-48 w-48 rounded-full border border-plum-700" aria-hidden />
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
