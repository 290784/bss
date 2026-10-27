import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-medium">Agendamento online indisponível</h1>
        <p className="mt-2 text-sm text-muted">Este endereço não existe ou o estabelecimento desativou o agendamento online. Entre em contato diretamente com o negócio.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-plum-600 underline">Conheça o Beauty OS</Link>
      </div>
    </div>
  );
}
