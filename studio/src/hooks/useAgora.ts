import { useEffect, useState } from "react";

/** Instante atual, atualizado a cada minuto (para o selo Aberto/Fechado). */
export function useAgora(intervaloMs = 60_000) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs);
    const vis = () => { if (document.visibilityState === "visible") setAgora(new Date()); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [intervaloMs]);
  return agora;
}
