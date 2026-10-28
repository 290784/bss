import { Icon } from "./Icon";
import { ButtonA } from "./Button";

/**
 * Localização: mapa ilustrado circular com pino (sem serviço de mapas embutido — o botão abre
 * o Google Maps com o endereço). Fundo no degradê forte da marca.
 */
export function MapCard({ endereco, complemento, referencia, consulta }: { endereco: string; complemento?: string; referencia?: string; consulta: string }) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  return (
    <div className="bg-marca relative overflow-hidden rounded-card p-5 text-sobre-marca shadow-card">
      <div className="flex flex-col items-center gap-4 text-center">
        <span aria-hidden className="relative grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-sobre-marca/10 ring-4 ring-sobre-marca/25">
          {/* ruas estilizadas */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full text-sobre-marca/25" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
            <path d="M-10 60 C40 50 90 80 170 64" /><path d="M-10 118 C50 104 110 128 170 110" /><path d="M56 -10 C50 50 70 110 60 170" /><path d="M118 -10 C112 60 128 100 116 170" strokeWidth="3" />
          </svg>
          <Icon name="pino" className="relative h-14 w-14 -translate-y-2 text-sobre-marca drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)]" />
        </span>
        <div>
          <p className="text-md font-semibold">{endereco}{complemento ? `, ${complemento}` : ""}</p>
          {referencia && <p className="mt-1 text-sm text-sobre-marca-suave">({referencia})</p>}
        </div>
        <ButtonA href={url} variante="secundaria" className="w-full border-transparent bg-sobre-marca text-primaria-escura hover:bg-sobre-marca-suave sm:w-auto" aria-label="Abrir endereço no Google Maps">
          <Icon name="pino" className="h-5 w-5" />Abrir no mapa
        </ButtonA>
      </div>
    </div>
  );
}
