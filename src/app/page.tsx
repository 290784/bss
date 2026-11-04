import type { Viewport } from "next";
import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { Logo } from "@/components/brand/logo";
import { Sparkle } from "@/components/brand/sparkles";
import { PLANS } from "@/domain/plans";
import { getSession } from "@/server/auth/session";
import { HeroWidget } from "@/components/marketing/hero-widget";
import { HeroAgenda } from "@/components/marketing/hero-agenda";
import { GlowCard } from "@/components/marketing/glow-card";
import { BookingDemo } from "@/components/marketing/booking-demo";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

const pill = (tone: "dark" | "light") =>
  cn("inline-flex h-10 items-center rounded-full px-4 whitespace-nowrap sm:px-5 text-[15px] font-medium transition",
    tone === "dark" ? "btn-glow text-white" : "neon-lilas border border-line-strong bg-surface/80 text-ink hover:bg-surface");
const NAV = [["#agendamento-online", "Agendamento online"], ["#recursos", "Recursos"], ["#como-funciona", "Como funciona"], ["#planos", "Planos"], ["#perguntas", "Dúvidas"]] as const;
const sectionTitle = "font-serif text-[34px] leading-[1.15] font-semibold tracking-[-0.01em] text-ink sm:text-[44px]";

const FEATURES: { art: IllustrationName; title: string; text: string; wide?: boolean }[] = [
  { art: "calendar-check", title: "Agenda sem conflito", wide: true, text: "Visão por dia, semana e mês, por profissional. Considera duração, tempo de limpeza, pausas e bloqueios e não deixa dois agendamentos no mesmo horário." },
  { art: "link", title: "Link de agendamento 24h", text: "Um link para a bio do Instagram e para o WhatsApp. A cliente vê só horários livres e você decide se confirma na hora ou revisa antes." },
  { art: "team", title: "Ficha da cliente", text: "Histórico, frequência, última e próxima visita, preferências e consentimentos. Veja quem está sumida e quem são as clientes mais fiéis." },
  { art: "chart", title: "Indicadores explicados", text: "Recebido, agendado, ocupação, faltas, ticket médio e clientes novas, cada número com a explicação de como é calculado." },
  { art: "wallet", title: "Pagamentos e sinal", text: "Registre sinal, pagamento parcial ou integral. Estornos ficam no histórico e cancelar nunca apaga o financeiro." },
  { art: "bell", title: "Lembrete com confirmação", wide: true, text: "Lembrete na véspera pelo WhatsApp do seu negócio. A cliente confirma ou pede para remarcar com um toque, e você é avisada." },
];

const SEGMENTS = ["Cabeleireiras e salões", "Manicures e nail designers", "Lash designers", "Designers de sobrancelhas", "Esteticistas", "Maquiadoras", "Depiladoras", "Massoterapeutas", "Clínicas de estética", "Espaços compartilhados"];

const FAQ = [
  { q: "Preciso instalar alguma coisa?", a: "Não. A Gê funciona no navegador do celular, tablet ou computador." },
  { q: "Serve para quem atende sozinha?", a: "Sim. O cadastro leva poucos minutos e a agenda já nasce configurada para você. Se a equipe crescer, é só adicionar profissionais." },
  { q: "As clientes conseguem marcar sozinhas?", a: "Sim, pela sua página de agendamento. Elas veem apenas horários livres de acordo com seu expediente, pausas e bloqueios." },
  { q: "Os lembretes já vão por WhatsApp?", a: "Pelo número do seu próprio negócio. Você pede em Configurações e a nossa equipe conecta com você numa chamada rápida. Até lá, o sistema mostra que o canal não está conectado e nenhuma mensagem é enviada sem você saber." },
  { q: "Quanto custa?", a: "Os preços ainda estão sendo definidos. Durante o teste de 14 dias você usa todos os recursos do plano Studio, sem cartão de crédito." },
  { q: "E a segurança dos dados das minhas clientes?", a: "Cada negócio só acessa os próprios dados, com isolamento aplicado diretamente no banco de dados. Você controla consentimentos e pode exportar suas clientes quando quiser." },
];

/** Landing creme: a barra do navegador acompanha o fundo. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#fbf5ec" };

export default async function LandingPage() {
  const session = await getSession();
  return (
    <div data-theme="light" data-landing className="bg-app relative min-h-dvh overflow-x-clip font-hero text-ink">
      <header className="neon-linha-b sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-6">
          <Logo variant="script" />
          <nav className="hidden flex-1 items-center gap-7 text-[15px] font-medium text-ink-soft lg:flex" aria-label="Seções">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-gold-400 after:transition-transform hover:text-ink hover:after:scale-x-100">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? <Link href="/app" className={pill("dark")}>Abrir minha agenda <ArrowRight className="ml-1.5 h-4 w-4" /></Link> : <>
              <span className="hidden sm:contents"><Link href="/entrar" className={pill("light")}>Entrar</Link></span>
              <Link href="/cadastro" className={pill("dark")}>Começar grátis <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </>}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-16 lg:pt-16 lg:pb-20">
          <div className="max-w-[640px]">
            <p className="inline-flex items-center rounded-full border border-gold-300 bg-surface/80 px-3.5 py-1.5 text-[13px] text-ink-soft">
              <b className="font-semibold text-ink">Teste grátis por 14 dias</b>&nbsp;· sem cartão de crédito
            </p>
            <h1 className="mt-6 font-serif text-[42px] leading-[1.1] font-semibold tracking-[-0.015em] text-ink sm:text-[58px] lg:text-[64px]">
              Agenda cheia,
              <br />
              cabeça leve.
              <br />
              <span className="text-gold">Conheça a </span>
              <span className="relative inline-block">
                <span className="text-ge px-1 font-script text-[1.5em] leading-[0.6] font-normal tracking-normal">Gê</span>
                <Sparkle size={20} color="text-gold-400" className="absolute -top-3 -right-4 motion-safe:[animation:twinkle_3s_ease-in-out_infinite]" />
              </span>
            </h1>
            <p className="mt-6 max-w-[34em] text-[18px] leading-[1.6] text-ink-soft sm:text-[19px]">
              A agenda da sua equipe, o link de agendamento para a bio do Instagram e o lembrete com confirmação pelo WhatsApp, num lugar só. <b className="font-semibold text-accent-text">Atenda mais e perca menos horários.</b>
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link href="/cadastro" className="btn-glow inline-flex h-[54px] items-center gap-2 rounded-full px-7 text-[17px] font-medium text-white">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#agendamento-online" className="group inline-flex items-center gap-3 text-[15px] font-medium text-ink-soft hover:text-ink">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-gold-300 bg-surface text-gold-600 transition group-hover:scale-105"><Play className="h-4 w-4 translate-x-[1px] fill-current" /></span>
                Ver como funciona
              </a>
            </div>
          </div>
          <HeroAgenda />
        </div>
      </section>

      <section className="neon-linha-y border-y border-line bg-surface/60 py-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-7 gap-y-2 px-4 text-[13px] text-ink-soft">
          {SEGMENTS.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      <section id="agendamento-online" className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6">
        <div data-theme="dark" className="bg-royal ring-glass border border-gold-line/40 relative grid items-center gap-10 overflow-hidden rounded-[32px] px-6 py-10 shadow-[0_40px_90px_-40px_rgb(100_35_80/0.7)] sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:py-14">
          <div className="relative max-w-[520px]">
            <p className="label-gold">Agendamento online</p>
            <h2 className={cn(sectionTitle, "mt-4")}>Sua cliente marca sozinha, <span className="text-gold-300">no horário que está livre</span></h2>
            <p className="mt-5 text-[18px] leading-[1.6] text-ink-soft">
              A cliente escolhe o serviço e a profissional e vê <b className="font-semibold text-white">só horários livres</b>, respeitando expediente, pausas, tempo de preparação e bloqueios. Você confirma na hora ou revisa antes.
            </p>
            <Link href="/cadastro" className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-violet-800 transition hover:bg-violet-100">Criar minha página <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <BookingDemo />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-[3fr_2fr]">
          <GlowCard className="glass flex flex-col justify-between gap-8 rounded-[28px] p-8 sm:p-10">
            <div>
              <p className="label-gold flex items-center gap-2"><Illustration name="bell" className="-my-2 -ml-1 h-12 w-12" />Lembretes</p>
              <h3 className="mt-3 font-serif text-[26px] leading-[1.2] font-semibold tracking-[-0.005em] text-ink">Menos faltas, sem mandar mensagem uma a uma</h3>
              <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft"><b className="font-semibold text-ink">Lembrete na véspera</b> com confirmação em um toque, pelo WhatsApp do seu negócio. Quando a cliente confirma, a agenda atualiza sozinha.</p>
            </div>
            <ChatDemo />
          </GlowCard>
          <GlowCard className="glass flex flex-col justify-between gap-8 rounded-[28px] p-8 sm:p-10">
            <div>
              <p className="label-gold flex items-center gap-2"><Illustration name="chart" className="-my-2 -ml-1 h-12 w-12" />Indicadores</p>
              <h3 className="mt-3 font-serif text-[26px] leading-[1.2] font-semibold tracking-[-0.005em] text-ink">Saiba quanto recebeu e quem sumiu</h3>
              <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft"><b className="font-semibold text-ink">Recebido, ocupação da agenda, faltas e clientes para reativar</b>, cada número com a explicação de como é calculado.</p>
            </div>
            <div className="flex h-24 items-end gap-2" aria-hidden>
              {[38, 52, 44, 66, 58, 80, 72, 94].map((h, i, all) => (
                <span key={i} className={cn("flex-1 rounded-t-md", i === all.length - 1 ? "bg-accent" : "bg-line-strong")} style={{ height: `${h}%` }} />
              ))}
            </div>
          </GlowCard>
        </div>
        <p className="mt-3 text-center text-[12px] text-muted">Ilustrações da interface com dados de exemplo.</p>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-4 py-24">
        {/* O carrossel de recursos (antes no topo) fica aqui, num bloco violeta. */}
        <div data-theme="dark" className="bg-royal ring-glass border border-gold-line/40 relative grid items-center gap-8 overflow-hidden rounded-[32px] px-6 py-10 shadow-[0_40px_90px_-40px_rgb(100_35_80/0.6)] sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:py-12">
          <div className="relative max-w-xl">
            <h2 className={sectionTitle}>Tudo o que o seu dia a dia pede, <span className="text-gold-300">sem caderninho</span></h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-ink-soft">Cada recurso resolve um problema concreto: horários perdidos, clientes que não voltam e tempo gasto em tarefas repetitivas.</p>
          </div>
          <HeroWidget />
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <GlowCard key={f.title} className={cn("glass rounded-[24px] p-6", f.wide && "lg:col-span-2")}>
              <Illustration name={f.art} className="-mt-1 -ml-1 h-16 w-16" />
              <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.text}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="como-funciona" data-theme="dark" className="bg-royal-rev relative overflow-hidden py-24 text-ink">
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
                <span className="font-serif text-5xl leading-none font-semibold text-gold-300 tabular">{i + 1}</span>
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
          <span aria-hidden className="gold-rule mt-5" />
          <p className="mt-4 text-ink-soft">Os valores estão sendo definidos. <b className="font-semibold text-ink">Comece agora com o teste gratuito</b> e avisaremos antes de qualquer cobrança.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.values(PLANS).map((p) => (
            <GlowCard key={p.id} data-theme={p.id === "studio" ? "dark" : undefined} className={cn("flex flex-col rounded-[24px] p-6", p.id === "studio" ? "bg-royal ring-glass shadow-[0_30px_70px_-30px_rgb(100_35_80/0.9)]" : "glass")}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl font-semibold">{p.name}</h3>
                {p.id === "studio" && <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-gold-300">Incluído no teste</span>}
              </div>
              <p className="mt-1 text-sm font-medium text-ink-soft">{p.tagline}</p>
              <p className="label-gold mt-5">Preço em definição</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-ink-soft">
                <li className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.id === "studio" ? "text-gold-300" : "text-gold-600")} />{p.maxProfessionals === 1 ? "1 profissional" : `Até ${p.maxProfessionals} profissionais`}</li>
                <li className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.id === "studio" ? "text-gold-300" : "text-gold-600")} />{p.maxUnits === 1 ? "1 unidade" : `Até ${p.maxUnits} unidades`}</li>
                <li className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.id === "studio" ? "text-gold-300" : "text-gold-600")} />Agenda, clientes e agendamento online</li>
                {p.features.includes("automations") && <li className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.id === "studio" ? "text-gold-300" : "text-gold-600")} />Automações de relacionamento</li>}
                {p.features.includes("reports_advanced") && <li className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.id === "studio" ? "text-gold-300" : "text-gold-600")} />Relatórios por profissional</li>}
              </ul>
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="perguntas" className="neon-linha-t border-t border-line py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className={sectionTitle}>Perguntas frequentes</h2>
            <span aria-hidden className="gold-rule mt-5" />
          </div>
          <div className="neon-divide divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                  {f.q}<span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24">
        <div data-theme="dark" className="bg-royal ring-glass border border-gold-line/40 relative overflow-hidden rounded-[36px] px-6 py-16 text-center shadow-[0_40px_100px_-40px_rgb(100_35_80/0.9)]">
          <h2 className={cn(sectionTitle, "relative mx-auto max-w-2xl")}>A <span className="font-script text-[1.35em] font-normal tracking-normal text-gold-300">Gê</span> organiza a sua agenda ainda esta semana</h2>
          <Link href="/cadastro" className="relative mt-9 inline-flex h-[54px] items-center gap-2 rounded-full bg-white px-7 text-[17px] font-semibold text-violet-800 transition hover:bg-violet-100">
            Criar conta grátis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="neon-linha-t border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo variant="script" />
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
