"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_KEY, type Theme } from "./theme";

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function setTheme(t: Theme) {
  if (t === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem(THEME_KEY, t); } catch { /* modo privado: vale só nesta visita */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f6f3ee" : "#16121a");
}

/** Botão de sol/lua para alternar entre tema claro e escuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button type="button" onClick={() => setTheme(next)} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-hover-tint hover:text-ink lg:h-10 lg:w-10", className)}
      aria-label={next === "light" ? "Usar tema claro" : "Usar tema escuro"} title={next === "light" ? "Tema claro" : "Tema escuro"}>
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
