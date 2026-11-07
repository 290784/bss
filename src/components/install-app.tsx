"use client";
import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Convite discreto para instalar a Gê na tela inicial: botão no Android/Chrome e passo a passo no iPhone. */
export function InstallApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      const jaInstalado = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (jaInstalado || localStorage.getItem("ge-instalar-fechado")) return;
    } catch { /* sem armazenamento: segue mostrando */ }
    const ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const t = setTimeout(() => { setIos(ehIos); if (ehIos) setOculto(false); }, 0);
    const antes = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); setOculto(false); };
    addEventListener("beforeinstallprompt", antes);
    addEventListener("appinstalled", () => setOculto(true));
    return () => { clearTimeout(t); removeEventListener("beforeinstallprompt", antes); };
  }, []);

  if (oculto || (!evento && !ios)) return null;
  const fechar = () => { setOculto(true); try { localStorage.setItem("ge-instalar-fechado", "1"); } catch { /* ok */ } };

  return (
    <div className="flex items-center gap-3 bg-highlight-subtle px-4 py-2 text-[13px] text-highlight-text">
      <span className="flex-1">
        {evento ? "Instale a Gê no celular para abrir como um app." : "Para instalar a Gê: toque em Compartilhar e depois em “Adicionar à Tela de Início”."}
      </span>
      {evento && (
        <button type="button" className="rounded-full bg-plum px-3 py-1 font-semibold text-white" onClick={async () => { await evento.prompt(); await evento.userChoice; setEvento(null); setOculto(true); }}>
          Instalar
        </button>
      )}
      <button type="button" aria-label="Fechar aviso" className="px-1" onClick={fechar}>✕</button>
    </div>
  );
}
