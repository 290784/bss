import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, CalendarCheck2, MapPin } from "lucide-react";
import { withSystem } from "@/server/db";
import { Sparkles } from "@/components/brand/sparkles";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getPublicBusiness } from "@/server/modules/public-booking";
import { addDaysToKey, localDateKey } from "@/lib/time";
import { BookingFlow } from "./booking-flow";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) return null;
  return withSystem((tx) => getPublicBusiness(tx, slug));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const biz = await load((await params).slug);
  if (!biz) return { title: "Agendamento indisponível" };
  return { title: `Agendar em ${biz.name}`, description: `Escolha o serviço e o horário em ${biz.name}.`, robots: { index: true } };
}

export default async function PublicBookingPage({ params }: Params) {
  const { slug } = await params;
  const biz = await load(slug);
  if (!biz) notFound();
  const today = localDateKey(new Date(), biz.timezone);
  const days = Array.from({ length: Math.min(biz.maxAdvanceDays + 1, 30) }, (_, i) => addDaysToKey(today, i));
  return (
    <div className="min-h-dvh bg-canvas">
      <header data-theme="dark" className="bg-royal relative overflow-hidden px-4 pt-10 pb-20">
        <ThemeToggle className="absolute top-3 right-3 z-10" />
        <Sparkles />
                <div className="relative mx-auto max-w-2xl">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-violet-100"><CalendarCheck2 className="h-4 w-4 text-violet-200" strokeWidth={2.4} />Agendamento online</p>
          <h1 className="mt-2 font-tight text-[34px] leading-tight font-extrabold tracking-[-0.025em] text-ink sm:text-[40px]">{biz.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/60">
            {biz.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{biz.address}</span>}
            {biz.instagram && <a href={`https://instagram.com/${biz.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink"><AtSign className="h-3.5 w-3.5" />{biz.instagram}</a>}
          </div>
        </div>
      </header>
      <main className="relative mx-auto -mt-10 max-w-2xl px-4 pb-16">
        <BookingFlow
          slug={biz.slug}
          timeZone={biz.timezone}
          days={days}
          requiresApproval={biz.requiresApproval}
          cancellationNoticeHours={biz.cancellationNoticeHours}
          policyText={biz.bookingPolicyText}
          services={biz.services.map((s) => ({ id: s.id, name: s.name, description: s.description, priceCents: s.price_cents, minutes: s.duration_minutes, category: s.category, professionalIds: s.professional_ids }))}
          professionals={biz.professionals.map((p) => ({ id: p.id, name: p.display_name, specialty: p.specialty }))}
        />
        <p className="mt-8 text-center text-xs text-muted">
          Agendamento por <Link href="/" className="font-script text-[20px] text-accent-text">Gê</Link> · <Link href="/privacidade" className="underline">Privacidade</Link>
        </p>
      </main>
    </div>
  );
}
