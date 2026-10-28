import { Logo } from "@/components/brand/logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 py-6"><Logo /></header>
      <main className="mx-auto max-w-3xl px-4 pb-20">
        <div className="mb-8 rounded-xl border border-highlight-border bg-highlight-subtle px-4 py-3 text-[13px] text-highlight-text">
          Documento inicial, sujeito a revisão jurídica antes do lançamento comercial. Não constitui garantia de conformidade legal.
        </div>
        <h1 className="font-tight tracking-[-0.02em] text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {updated}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
      </main>
    </div>
  );
}
