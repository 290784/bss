import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, getAppContext } from "@/server/context";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BUSINESS_TYPES, presetsFor } from "@/server/modules/catalog";
import { withSystem } from "@/server/db";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Configurar meu negócio" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const ctx = await getAppContext();
  if (ctx?.org.onboardingCompleted) redirect("/app");
  if (ctx && ctx.role !== "owner") redirect("/app");
  let businessType: string | null = null;
  if (ctx) {
    const [o] = await withSystem((tx) => tx<{ business_type: string }[]>`select business_type from app.organizations where id = ${ctx.org.id}`);
    businessType = o?.business_type ?? null;
  }
  const presets = Object.fromEntries(BUSINESS_TYPES.map((b) => [b.id, presetsFor(b.id)]));
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Logo href="/" />
        <span className="flex items-center gap-2 text-[13px] text-muted">Olá, {user.fullName.split(" ")[0]}<ThemeToggle /></span>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <OnboardingFlow
          initialStep={ctx ? 2 : 1}
          businessTypes={BUSINESS_TYPES.map(({ id, label }) => ({ id, label }))}
          presets={presets}
          createdBusinessType={businessType}
        />
      </main>
    </div>
  );
}
