"use client";
import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";

/** Erro dentro do app: o menu continua na tela e a profissional pode tentar de novo sem perder o lugar. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-md rounded-card border border-line bg-surface px-5 py-8 text-center">
      <h1 className="font-serif text-[22px] leading-tight font-semibold">Esta tela não carregou</h1>
      <p className="mt-2 text-sm text-muted">Pode ter sido a internet. Seus dados estão salvos; tente de novo em alguns segundos.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => retry()} className="btn-glow inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-medium text-white">
          <RotateCw className="h-4 w-4" aria-hidden />Tentar de novo
        </button>
        <Link href="/app/agenda" className="inline-flex h-11 items-center px-3 text-sm font-medium text-accent-text underline-offset-4 hover:underline">Ir para a agenda</Link>
      </div>
    </div>
  );
}
