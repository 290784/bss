import type { Metadata } from "next";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Esqueceu a senha?</h1>
      <span aria-hidden className="gold-rule mt-2" />
      <p className="mt-1 mb-8 text-sm text-muted">Coloque o e-mail da sua conta e a gente manda um link para você escolher uma senha nova.</p>
      <ForgotPasswordForm />
    </>
  );
}
