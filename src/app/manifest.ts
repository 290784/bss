import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Gê — agenda e gestão de beleza",
    short_name: "Gê",
    description: "Agenda, clientes e agendamento online para profissionais da beleza.",
    lang: "pt-BR",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f3ee",
    theme_color: "#f6f3ee",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/app/agenda", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Clientes", url: "/app/clientes", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
