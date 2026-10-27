import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, Check, Globe, LineChart, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { PLANS } from "@/domain/plans";
import { getSession } from "@/server/auth/session";

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
  { q: "Preciso instalar alguma coisa?", a: "Não. O Beauty OS funciona no navegador do celular, tablet ou computador." },
  { q: "Serve para quem atende sozinha?", a: "Sim. O cadastro leva poucos minutos e a agenda já nasce configurada para você. Se a equipe crescer, é só adicionar profissionais." },
  { q: "As clientes conseguem marcar sozinhas?", a: "Sim, pela sua página de agendamento. Elas veem apenas horários livres de acordo com seu expediente, pausas e bloqueios." },
  { q: "Os lembretes já vão por WhatsApp?", a: "Ainda não. A integração com a API oficial do WhatsApp Business está em preparação. Até lá, o sistema mostra claramente que o canal não está conectado — nenhuma mensagem é enviada sem você saber." },
  { q: "Quanto custa?", a: "Os preços dos planos ainda estão sendo definidos. Durante o teste de 14 dias você usa todos os recursos do plano Studio, sem cartão de crédito." },
  { q: "E a segurança dos dados das minhas clientes?", a: "Cada negócio só acessa os próprios dados, com isolamento aplicado diretamente no banco de dados. Você controla consentimentos e pode exportar suas clientes quando quiser." },
];

export default async function LandingPage() {
  const session = await getSession();
  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
            <a href="#recursos" className="hover:text-ink">Recursos</a>
            <a href="#como-funciona" className="hover:text-ink">Como funciona</a>
            <a href="#planos" className="hover:text-ink">Planos</a>
            <a href="#perguntas" className="hover:text-ink">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? <ButtonLink href="/app" size="sm">Abrir minha agenda</ButtonLink> : <>
              <Link href="/entrar" className="hidden px-3 text-sm font-medium text-ink-soft hover:text-ink sm:inline">Entrar</Link>
              <ButtonLink href="/cadastro" size="sm">Teste grátis</ButtonLink>
            </>}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-champagne-300 bg-champagne-100 px-3 py-1 text-xs font-medium text-champagne-600">
            <Sparkles className="h-3.5 w-3.5" />Gestão para beleza e estética
          </p>
          <h1 className="mt-5 font-display text-[44px] leading-[1.05] font-normal tracking-[-0.02em] text-ink sm:text-[56px]">
            Menos tempo administrando. <em className="text-plum-600">Mais clientes voltando.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Agenda inteligente, agendamento online, ficha de clientes e indicadores claros — em um só lugar, feito para quem atende sozinha ou com equipe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/cadastro" size="lg">Começar teste grátis <ArrowRight className="h-4 w-4" /></ButtonLink>
            <a href="#como-funciona" className="px-2 text-sm font-medium text-ink-soft hover:text-ink">Ver como funciona</a>
          </div>
          <p className="mt-4 text-[13px] text-muted">14 dias com todos os recursos · sem cartão de crédito · cancele quando quiser</p>
        </div>
        <ProductPreview />
      </section>

      <section className="border-y border-line bg-surface/60 py-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 text-[13px] text-ink-soft">
          {SEGMENTS.map((s) => <li key={s} className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-plum-500" />{s}</li>)}
        </ul>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-4 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-normal tracking-[-0.01em]">Tudo o que o seu dia a dia pede, sem planilhas nem caderninho</h2>
          <p className="mt-4 text-ink-soft">Cada recurso existe para resolver um problema concreto: horários perdidos, clientes que não voltam e tempo gasto com tarefas repetitivas.</p>
        </div>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-plum-50 text-plum-600"><f.icon className="h-5 w-5" strokeWidth={1.75} /></div>
              <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-plum-900 py-24 text-champagne-100">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-xl font-display text-4xl font-light">Do cadastro ao primeiro agendamento em poucos minutos</h2>
          <ol className="mt-14 grid gap-8 md:grid-cols-4">
            {[
              ["Conte o que você faz", "Escolha seu segmento e já começamos com serviços sugeridos para você ajustar."],
              ["Defina seus horários", "Dias de atendimento, pausas e bloqueios. A agenda respeita tudo automaticamente."],
              ["Compartilhe seu link", "Coloque a página de agendamento na bio e no WhatsApp."],
              ["Acompanhe e fidelize", "Veja quem está sumida, sua ocupação e quanto recebeu no mês."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="font-display text-5xl font-light text-champagne-300">{i + 1}</span>
                <h3 className="mt-3 text-[17px] font-semibold text-white">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-plum-200">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-normal">Planos para cada momento do seu negócio</h2>
          <p className="mt-4 text-ink-soft">Os valores estão sendo definidos. Comece agora com o teste gratuito e avisaremos antes de qualquer cobrança.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.values(PLANS).map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.id === "studio" ? "border-plum-500 bg-surface shadow-[var(--shadow-pop)]" : "border-line bg-surface"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl">{p.name}</h3>
                {p.id === "studio" && <span className="rounded-full bg-plum-50 px-2 py-0.5 text-xs font-medium text-plum-700">Incluído no teste</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <p className="mt-5 text-sm font-medium text-ink-soft">Preço em definição</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-ink-soft">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-plum-600" />{p.maxProfessionals === 1 ? "1 profissional" : `Até ${p.maxProfessionals} profissionais`}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-plum-600" />{p.maxUnits === 1 ? "1 unidade" : `Até ${p.maxUnits} unidades`}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-plum-600" />Agenda, clientes e agendamento online</li>
                {p.features.includes("automations") && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-plum-600" />Automações de relacionamento</li>}
                {p.features.includes("reports_advanced") && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-plum-600" />Relatórios por profissional</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="perguntas" className="border-t border-line bg-surface/60 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-4xl font-normal">Perguntas frequentes</h2>
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

      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-plum-500" strokeWidth={1.5} />
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-normal">Comece hoje e veja sua agenda organizada ainda esta semana</h2>
        <ButtonLink href="/cadastro" size="lg" className="mt-8">Criar conta grátis <ArrowRight className="h-4 w-4" /></ButtonLink>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-5">
            <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
            <Link href="/termos" className="hover:text-ink">Termos de uso</Link>
            <a href="mailto:contato@beautyos.app" className="hover:text-ink">Contato</a>
          </nav>
          <span>© {new Date().getFullYear()} Beauty OS</span>
        </div>
      </footer>
    </div>
  );
}

/** Ilustração da interface (composição estática, não um print de dados reais). */
function ProductPreview() {
  const rows = [
    { t: "09:00", n: "Cliente A", s: "Manicure + pedicure", st: "border-l-st-completed bg-st-completed-bg", h: 76 },
    { t: "10:30", n: "Cliente B", s: "Alongamento em gel", st: "border-l-st-confirmed bg-st-confirmed-bg", h: 112 },
    { t: "13:00", n: "Cliente C", s: "Design de sobrancelhas", st: "border-l-st-pending bg-st-pending-bg", h: 52 },
  ];
  return (
    <figure className="relative" aria-label="Ilustração da agenda do Beauty OS">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-plum-100 via-champagne-100 to-transparent" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div><div className="text-xs text-muted">Terça-feira</div><div className="font-display text-lg">Agenda de hoje</div></div>
          <div className="flex gap-1.5"><span className="rounded-md bg-sunken px-2 py-1 text-[11px]">Dia</span><span className="rounded-md px-2 py-1 text-[11px] text-muted">Semana</span></div>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-line bg-line text-center">
          {[["Ocupação", "78%"], ["Confirmados", "6"], ["A receber", "R$ 240"]].map(([l, v]) => (
            <div key={l} className="bg-surface px-3 py-3"><div className="text-[11px] text-muted">{l}</div><div className="text-lg font-semibold tabular">{v}</div></div>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-4">
          {rows.map((r) => (
            <div key={r.t} className="flex gap-3">
              <span className="w-10 pt-1 text-[11px] text-muted tabular">{r.t}</span>
              <div className={`flex-1 rounded-md border-l-[3px] px-3 py-2 ${r.st}`} style={{ minHeight: r.h * 0.6 }}>
                <div className="text-[13px] font-medium">{r.n}</div><div className="text-[11px] text-ink-soft">{r.s}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-3"><span className="w-10 pt-1 text-[11px] text-muted tabular">15:00</span><div className="flex-1 rounded-md border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted">Horário livre · aparece na sua página de agendamento</div></div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-muted">Ilustração da interface</figcaption>
    </figure>
  );
}
