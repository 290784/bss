import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/app");
  return (
    <>
      <h1 className="font-display text-3xl font-medium">Crie sua conta</h1>
      <p className="mt-1 mb-8 text-sm text-muted">14 dias grátis com todos os recursos do plano Studio. Sem cartão.</p>
      <SignUpForm />
    </>
  );
}
