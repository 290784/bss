"use client";
import { useEffect } from "react";

/** No iPhone, o estado ":active" (o "afundar" ao tocar) só aparece se a página escuta toques. */
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
