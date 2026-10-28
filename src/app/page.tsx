import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, Check, Globe, LineChart, Search, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sparkle, Sparkles } from "@/components/brand/sparkles";
import { PLANS } from "@/domain/plans";
import { getSession } from "@/server/auth/session";
import { HeroWidget } from "@/components/marketing/hero-widget";
import { GlowCard } from "@/components/marketing/glow-card";
import { BookingDemo } from "@/components/marketing/booking-demo";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

const pill = (tone: "dark" | "light") =>
  cn("inline-flex h-10 items-center rounded-full px-4 whitespace-nowrap sm:px-5 text-[15px] font-medium transition",
    tone === "dark" ? "btn-glow text-white" : "glass text-ink hover:bg-white/10");
const sectionTitle = "font-tight text-[36px] leading-[1.12] font-extrabold tracking-[-0.025em] text-ink sm:text-[44px]";

const FEATURES = [
  { icon: CalendarDays, title: "Agenda que evita conflitos", text: "Visão por dia, semana e mês, por profissional. Considera duração, tempo de limpeza, pausas e bloqueios — e impede dois agendamentos no mesmo horário." },
  { icon: Globe, title: "Agendamento online 24h", text: "Um link para a bio do Instagram e para o WhatsApp. A cliente vê só horários realmente livres e você decide se confirma na hora ou revisa antes." },
  { icon: Users, title: "Ficha completa da cliente", text: "Histórico, frequência, última e próxima visita, preferências e consentimentos. Saiba quem está sumida e quem são suas clientes mais fiéis." },
  { icon: LineChart, title: "Indicadores que fazem sentido", text: "Recebido, agendado, ocupação da agenda, faltas, ticket médio e clientes novas — cada número com a explicação de como é calculado." },
  { icon: Wallet, title: "Pagamentos sem confusão", text: "Registre sinal, pagamento parcial ou integral. Estornos ficam no histórico e cancelamentos nunca apagam o financeiro." },
  { icon: BellRing, title: "Lembretes automáticos", text: "Confirmação e lembrete 24h antes, cancelados automaticamente quando a cliente remarca. Integração com WhatsApp oficial em preparação." },
];

const SEGMENTS = ["Cabeleireiras e salões", "Manicures e nail designers", "Lash designers", "Designers de sobrancelhas", "Esteticistas", "Maquiadoras", "Depiladoras", "Massoterapeutas", "Clínicas de estética", "Espaços compartilhados"];

const FAQ = [
  { q: "Preciso instalar alguma coisa?", a: "Não. A Gê funciona no navegador do celular, tablet ou computador." },
  { q: "Serve para quem atende sozinha?", a: "Sim. O cadastro leva poucos minutos e a agenda já nasce configurada para você. Se a equipe crescer, é só adicionar profissionais." },
  { q: "As clientes conseguem marcar sozinhas?", a: "Sim, pela sua página de agendamento. Elas veem apenas horários livres de acordo com seu expediente, pausas e bloqueios." },
  { q: "Os lembretes já vão por WhatsApp?", a: "Ainda não. A integração com a API oficial do WhatsApp Business está em preparação. Até lá, o sistema mostra claramente que o canal não está conectado — nenhuma mensagem é enviada sem você saber." },
  { q: "Quanto custa?", a: "Os preços dos planos ainda estão sendo definidos. Durante o teste de 14 dias você usa todos os recursos do plano Studio, sem cartão de crédito." },
  { q: "E a segurança dos dados das minhas clientes?", a: "Cada negócio só acessa os próprios dados, com isolamento aplicado diretamente no banco de dados. Você controla consentimentos e pode exportar suas clientes quando quiser." },
];

export default async function LandingPage() {
  const session = await getSession();
  return (
    <div data-theme="dark" className="bg-app relative min-h-dvh overflow-x-clip font-hero text-ink">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden flex-1 items-center gap-6 text-[15px] font-medium text-ink-soft lg:flex" aria-label="Seções">
            <a href="#agendamento-online" className="transition-colors hover:text-violet-100">Agendamento online</a>
            <a href="#recursos" className="transition-colors hover:text-violet-100">Recursos</a>
            <a href="#como-funciona" className="transition-colors hover:text-violet-100">Como funciona</a>
            <a href="#planos" className="transition-colors hover:text-violet-100">Planos</a>
            <a href="#perguntas" className="transition-colors hover:text-violet-100">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? <Link href="/app" className={pill("dark")}>Abrir minha agenda</Link> : <>
              <span className="hidden sm:contents"><Link href="/entrar" className={pill("light")}>Entrar</Link></span>
              <Link href="/cadastro" className={pill("dark")}>Começar grátis</Link>
            </>}
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-royal/40 blur-[140px]" aria-hidden />
        <Sparkles />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-16 lg:pt-16 lg:pb-24">
          <div className="max-w-[640px]">
            <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft">
              <Sparkle size={12} /> Teste grátis por 14 dias · sem cartão de crédito
            </p>
            <h1 className="mt-6 font-hero text-[44px] leading-[1.08] font-bold tracking-[-0.025em] text-ink sm:text-[60px] lg:text-[66px]">
              Agenda cheia,
              <br />
              cabeça leve.
              <br />
              <span className="text-ink-soft">Conheça a </span>
              <span className="relative inline-block">
                <span className="text-shimmer px-1 font-script text-[1.5em] leading-[0.6] font-normal tracking-normal">Gê</span>
                <Sparkle size={20} className="absolute -top-3 -right-4 motion-safe:[animation:twinkle_3s_ease-in-out_infinite]" />
              </span>
            </h1>
            <p className="mt-6 max-w-[34em] text-[18px] leading-[1.6] text-ink-soft sm:text-[19px]">
              Agenda inteligente, agendamento online 24h, lembretes e indicadores claros. Atenda mais, perca menos horários e veja suas clientes voltando — com um sistema feito para beleza e estética.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/cadastro" className="btn-glow inline-flex h-[54px] items-center gap-2 rounded-full px-7 text-[17px] font-medium text-white">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#agendamento-online" className="px-2 text-[15px] font-medium text-ink-soft hover:text-violet-100">Ver como funciona</a>
            </div>
          </div>
          <HeroWidget />
        </div>
      </section>

      <section className="border-y border-white/5 bg-white/[0.02] py-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-[13px] text-ink-soft">
          {SEGMENTS.map((s) => <li key={s} className="inline-flex items-center gap-1.5"><Sparkle size={8} />{s}</li>)}
        </ul>
      </section>

      <section id="agendamento-online" className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6">
        <div className="bg-royal ring-glass relative grid items-center gap-10 overflow-hidden rounded-[32px] px-6 py-10 shadow-[0_40px_90px_-40px_rgb(147_3_197/0.7)] sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:py-14">
          <Sparkles points={[[6, 12, 8, 0.3], [42, 86, 6, 1.8], [52, 10, 7, 2.9], [96, 40, 9, 1.1], [30, 52, 5, 2.2]]} />
          <div className="relative max-w-[520px]">
            <p className="flex items-center gap-2 text-[16px] font-semibold text-violet-100"><Search className="h-5 w-5 text-violet-200" strokeWidth={2.6} />Agendamento online</p>
            <h2 className={cn(sectionTitle, "mt-4")}>Encontre o horário perfeito, <span className="font-script text-[1.3em] font-normal tracking-normal text-violet-200">mais rápido.</span></h2>
            <p className="mt-5 text-[18px] leading-[1.6] text-ink-soft">
              Sua cliente escolhe o serviço e a profissional e vê só horários realmente livres — respeitando expediente, pausas, tempo de preparação e bloqueios. Você confirma na hora ou revisa antes.
            </p>
            <Link href="/cadastro" className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-violet-800 shadow-[0_0_30px_-6px_rgb(234_207_252/0.8)] transition hover:bg-violet-100">Criar minha página <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <BookingDemo />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <GlowCard className="glass flex flex-col justify-between gap-8 rounded-[28px] p-8 sm:p-10">
            <div>
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink"><BellRing className="h-5 w-5 text-violet-200" strokeWidth={2.4} />Lembretes</p>
              <h3 className="mt-3 font-tight text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em] text-ink">Menos faltas, sem mandar mensagem uma a uma.</h3>
              <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft">Confirmação e lembrete 24h antes, cancelados automaticamente quando a cliente remarca. Integração com o WhatsApp oficial em preparação.</p>
            </div>
            <div className="flex flex-col gap-2" aria-hidden>
              <span className="self-start rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-[14px] text-ink ring-1 ring-white/10">Oi, Ana! Lembrete: amanhã às 14:30, Design de sobrancelhas</span>
              <span className="self-end btn-glow rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] text-white">Confirmado!</span>
            </div>
          </GlowCard>
          <GlowCard className="glass flex flex-col justify-between gap-8 rounded-[28px] p-8 sm:p-10">
            <div>
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink"><LineChart className="h-5 w-5 text-violet-200" strokeWidth={2.4} />Indicadores</p>
              <h3 className="mt-3 font-tight text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em] text-ink">Saiba quanto recebeu — e quem sumiu.</h3>
              <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft">Recebido, ocupação da agenda, faltas e clientes para reativar, cada número com a explicação de como é calculado.</p>
            </div>
            <div className="flex h-24 items-end gap-2" aria-hidden>
              {[38, 52, 44, 66, 58, 80, 72, 94].map((h, i) => (
                <span key={i} className="flex-1 rounded-t-md bg-[linear-gradient(var(--color-bar-green-to),var(--color-bar-green-from))]" style={{ height: `${h}%`, opacity: 0.55 + i * 0.06 }} />
              ))}
            </div>
          </GlowCard>
        </div>
        <p className="mt-3 text-center text-[12px] text-muted">Ilustrações da interface com dados de exemplo.</p>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-4 py-24">
        <div className="max-w-2xl">
          <h2 className={sectionTitle}>Tudo o que o seu dia a dia pede, <span className="font-script text-[1.3em] font-normal tracking-normal text-violet-200">sem caderninho</span></h2>
          <p className="mt-4 text-ink-soft">Cada recurso existe para resolver um problema concreto: horários perdidos, clientes que não voltam e tempo gasto com tarefas repetitivas.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <GlowCard key={f.title} className="glass rounded-[24px] p-6">
              <div className="bg-royal ring-glass grid h-12 w-12 place-items-center rounded-2xl text-violet-100 shadow-[0_0_24px_-6px_rgb(171_61_245/0.7)]"><f.icon className="h-5 w-5" strokeWidth={1.75} /></div>
              <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.text}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-royal-rev relative overflow-hidden py-24 text-ink">
        <Sparkles />
        <div className="relative mx-auto max-w-6xl px-4">
          <h2 className={cn(sectionTitle, "max-w-xl")}>Do cadastro ao primeiro agendamento em poucos minutos</h2>
          <ol className="mt-14 grid gap-8 md:grid-cols-4">
            {[
              ["Conte o que você faz", "Escolha seu segmento e já começamos com serviços sugeridos para você ajustar."],
              ["Defina seus horários", "Dias de atendimento, pausas e bloqueios. A agenda respeita tudo automaticamente."],
              ["Compartilhe seu link", "Coloque a página de agendamento na bio e no WhatsApp."],
              ["Acompanhe e fidelize", "Veja quem está sumida, sua ocupação e quanto recebeu no mês."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="font-script text-6xl leading-none text-violet-200 drop-shadow-[0_0_12px_rgb(213_158_250/0.7)]">{i + 1}</span>
                <h3 className="mt-3 text-[17px] font-semibold text-white">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-24">
        <div className="max-w-2xl">
          <h2 className={sectionTitle}>Planos para cada momento do seu negócio</h2>
          <p className="mt-4 text-ink-soft">Os valores estão sendo definidos. Comece agora com o teste gratuito e avisaremos antes de qualquer cobrança.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.values(PLANS).map((p) => (
            <GlowCard key={p.id} className={cn("flex flex-col rounded-[24px] p-6", p.id === "studio" ? "bg-royal ring-glass shadow-[0_30px_70px_-30px_rgb(147_3_197/0.9)]" : "glass")}>
              <div className="flex items-center justify-between">
                <h3 className="font-tight text-2xl font-extrabold tracking-[-0.02em]">{p.name}</h3>
                {p.id === "studio" && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-violet-100"><Sparkle size={9} />Incluído no teste</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <p className="mt-5 text-sm font-medium text-ink-soft">Preço em definição</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-ink-soft">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-200" />{p.maxProfessionals === 1 ? "1 profissional" : `Até ${p.maxProfessionals} profissionais`}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-200" />{p.maxUnits === 1 ? "1 unidade" : `Até ${p.maxUnits} unidades`}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-200" />Agenda, clientes e agendamento online</li>
                {p.features.includes("automations") && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-200" />Automações de relacionamento</li>}
                {p.features.includes("reports_advanced") && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-200" />Relatórios por profissional</li>}
              </ul>
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="perguntas" className="border-t border-white/5 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
          <h2 className={sectionTitle}>Perguntas frequentes</h2>
          <div className="divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  {f.q}<span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="bg-royal ring-glass relative overflow-hidden rounded-[36px] px-6 py-16 text-center shadow-[0_40px_100px_-40px_rgb(147_3_197/0.9)]">
          <Sparkles />
          <p className="relative font-script text-[44px] leading-none text-violet-100 drop-shadow-[0_0_14px_rgb(234_207_252/0.6)]">comece a brilhar</p>
          <h2 className={cn(sectionTitle, "relative mx-auto mt-4 max-w-2xl")}>Sua agenda organizada ainda esta semana</h2>
          <Link href="/cadastro" className="relative mt-9 inline-flex h-[54px] items-center gap-2 rounded-full bg-white px-7 text-[17px] font-semibold text-violet-800 shadow-[0_0_40px_-6px_rgb(234_207_252/0.9)] transition hover:bg-violet-100">
            Criar conta grátis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-5">
            <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
            <Link href="/termos" className="hover:text-ink">Termos de uso</Link>
            {BRAND.contactEmail && <a href={`mailto:${BRAND.contactEmail}`} className="hover:text-ink">Contato</a>}
          </nav>
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
        </div>
      </footer>
    </div>
  );
}
