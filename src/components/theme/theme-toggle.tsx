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
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f8f4fc" : "#05040d");
}

/** Botão de sol/lua para alternar entre tema claro e escuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button type="button" onClick={() => setTheme(next)} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-sunken hover:text-ink lg:h-9 lg:w-9", className)}
      aria-label={next === "light" ? "Usar tema claro" : "Usar tema escuro"} title={next === "light" ? "Tema claro" : "Tema escuro"}>
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
