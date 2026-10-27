"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Algo não saiu como esperado</h1>
        <p className="mt-1 text-sm text-muted">Nada foi perdido. Tente novamente; se persistir, fale com o suporte.</p>
        <button onClick={reset} className="mt-6 h-10 rounded-[10px] bg-ink-warm px-4 text-sm font-medium text-white hover:bg-[#2b241d]">Tentar novamente</button>
      </div>
    </div>
  );
}
