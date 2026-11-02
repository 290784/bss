/** Preferência de tema guardada no aparelho. O claro é o padrão (uso no salão, de dia); o escuro é opção. */
export const THEME_KEY = "ge-tema";
export type Theme = "light" | "dark";

/** Roda no <head> antes da pintura: aplica o tema salvo (claro, salvo se a pessoa escolheu o escuro). */
export const THEME_BOOT_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")!=="dark")document.documentElement.dataset.theme="light"}catch(e){document.documentElement.dataset.theme="light"}`;
