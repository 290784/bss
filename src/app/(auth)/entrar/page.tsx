import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; senha?: string }> }) {
  if (await getSession()) redirect("/app");
  const { next, senha } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Bem-vinda de volta</h1>
      <span aria-hidden className="gold-rule mt-2" />
      <p className="mt-1 mb-8 text-sm text-muted">Entre para ver sua agenda de hoje.</p>
      {senha === "redefinida" && <p role="status" className="mb-4 rounded-2xl bg-st-completed-bg p-3 text-sm text-st-completed">Senha nova salva. Entre com ela.</p>}
      <SignInForm next={next} />
    </>
  );
}
