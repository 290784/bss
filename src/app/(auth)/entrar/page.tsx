import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/app");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Bem-vinda de volta</h1>
      <p className="mt-1 mb-8 text-sm text-muted">Entre para ver sua agenda de hoje.</p>
      <SignInForm next={next} />
    </>
  );
}
