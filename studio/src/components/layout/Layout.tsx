import { Outlet, ScrollRestoration } from "react-router";
import { Header } from "./Header";
import { Ambient } from "@/components/ui/Ambient";
import { Footer } from "./Footer";
import { WhatsAppFab } from "./WhatsAppFab";

export function Layout() {
  return (
    <>
      <Ambient />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-botao focus:bg-superficie focus:px-4 focus:py-2">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
      <ScrollRestoration />
    </>
  );
}
