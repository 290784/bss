import type { Metadata } from "next";
import Link from "next/link";
import { withSystem } from "@/server/db";
import { verifyEmailWithToken } from "@/server/modules/email-tokens";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const ok = await withSystem((tx) => verifyEmailWithToken(tx, token));
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">{ok ? "E-mail confirmado" : "Link inválido"}</h1>
      <span aria-hidden className="gold-rule mt-2" />
      <p className="mt-3 mb-6 text-sm text-ink-soft">{ok ? "Pronto! Seu e-mail está confirmado." : "Esse link venceu ou já foi usado. Se o seu e-mail já está confirmado, não precisa fazer nada."}</p>
      <Link href="/app" className="font-medium text-accent-text hover:underline">Ir para a minha agenda</Link>
    </>
  );
}
