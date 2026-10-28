import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-tight tracking-[-0.02em] font-extrabold text-6xl text-accent-border">404</p>
        <h1 className="mt-2 text-xl font-semibold">Página não encontrada</h1>
        <p className="mt-1 text-sm text-muted">O endereço pode estar incorreto ou o conteúdo não existe mais.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent-text underline">Voltar ao início</Link>
      </div>
    </div>
  );
}
