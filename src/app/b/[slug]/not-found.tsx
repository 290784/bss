import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="font-tight tracking-[-0.02em] text-2xl font-extrabold">Agendamento online indisponível</h1>
        <p className="mt-2 text-sm text-muted">Este endereço não existe ou o estabelecimento desativou o agendamento online. Entre em contato diretamente com o negócio.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent-text underline">Conheça a Gê</Link>
      </div>
    </div>
  );
}
