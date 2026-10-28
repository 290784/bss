/** Preferência de tema guardada no aparelho. O escuro é o padrão da marca. */
export const THEME_KEY = "ge-tema";
export type Theme = "light" | "dark";

/** Roda no <head> antes da pintura: aplica o tema salvo sem "piscar" o escuro. */
export const THEME_BOOT_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
