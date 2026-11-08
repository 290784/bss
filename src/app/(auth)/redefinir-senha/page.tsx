import type { Metadata } from "next";
import Link from "next/link";
import { withSystem } from "@/server/db";
import { tokenIsValid } from "@/server/modules/email-tokens";
import { ResetPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valido = await withSystem((tx) => tokenIsValid(tx, token, "reset"));
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Escolha uma senha nova</h1>
      <span aria-hidden className="gold-rule mt-2" />
      {valido ? (
        <>
          <p className="mt-1 mb-8 text-sm text-muted">Depois de salvar, você entra com ela. Quem estava conectada com a senha antiga sai.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <>
          <p className="mt-3 mb-6 text-sm text-ink-soft">Esse link venceu ou já foi usado. Peça um novo, é rapidinho.</p>
          <Link href="/esqueci-a-senha" className="font-medium text-accent-text hover:underline">Pedir um link novo</Link>
        </>
      )}
    </>
  );
}
