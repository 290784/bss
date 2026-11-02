import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside data-theme="dark" className="relative hidden overflow-hidden bg-plum p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo href="/" className="relative [&_span]:text-white" />
        <div className="relative max-w-md">
          <p className="font-serif text-[38px] leading-[1.12] font-semibold tracking-[-0.01em]">
            Menos tempo administrando, menos horários perdidos e <span className="font-script text-[1.35em] font-normal tracking-normal text-white">mais clientes voltando</span>.
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-white/65">Agenda, clientes e agendamento online em um só lugar, feito para o dia a dia de quem trabalha com beleza.</p>
        </div>
        <p className="relative text-xs text-white/50">Teste grátis por 14 dias. Sem cartão de crédito.</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="flex items-center justify-between"><div className="lg:invisible"><Logo /></div><ThemeToggle /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
