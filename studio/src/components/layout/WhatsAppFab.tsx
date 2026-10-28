import { studio } from "@/data/studio";
import { linkWhatsApp } from "@/services/booking";
import { Icon } from "@/components/ui/Icon";

/** Botão flutuante de WhatsApp (todas as páginas). */
export function WhatsAppFab() {
  return (
    <a href={linkWhatsApp(studio, `Olá! Vim pelo site do ${studio.marca.nome}.`)} target="_blank" rel="noreferrer"
      aria-label={`Conversar no WhatsApp: ${studio.contato.whatsapp.exibicao}`}
      className="bg-botao fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 grid h-14 w-14 place-items-center rounded-full text-sobre-marca transition hover:brightness-110 active:scale-95">
      <Icon name="whatsapp" className="h-7 w-7" />
    </a>
  );
}
