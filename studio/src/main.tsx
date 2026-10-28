import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "@fontsource/allura/latin-400.css";
import "./theme/theme.css";
import { Layout } from "./components/layout/Layout";
import Links from "./pages/Links";
// As páginas são leves e vão no mesmo pacote: carregar sob demanda trocava "Carregando…" pelo
// conteúdo e deslocava a tela (CLS). O que é pesado — o gerador de PDF — continua sob demanda.
import Agendar from "./pages/Agendar";
import Manual from "./pages/Manual";
import Guia from "./pages/Guia";
import NaoEncontrada from "./pages/NaoEncontrada";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Links /> },
      { path: "/agendar", element: <Agendar /> },
      { path: "/manual", element: <Manual /> },
      { path: "/guia", element: <Guia /> },
      { path: "*", element: <NaoEncontrada /> },
    ],
  },
]);

// PWA: service worker (funciona offline e pode ser instalado na tela inicial).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
);
