"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-serif text-[22px] font-semibold">Algo não saiu como esperado</h1>
        <span aria-hidden className="gold-rule mx-auto mt-2" />
        <p className="mt-1 text-sm text-muted">Nada foi perdido. Tente novamente; se persistir, fale com o suporte.</p>
        <button onClick={reset} className="mt-6 h-11 rounded-[10px] btn-glow px-4 text-sm font-medium text-white">Tentar novamente</button>
      </div>
    </div>
  );
}
