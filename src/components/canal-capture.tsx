"use client";
import { useEffect } from "react";

/** Guarda no aparelho o código do canal do primeiro link (?c=ig-bio ou ?utm_source=…); o cadastro manda junto. */
export function CanalCapture() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const c = (q.get("c") ?? q.get("utm_source") ?? "").trim().toLowerCase();
      if (/^[a-z0-9][a-z0-9_-]{0,39}$/.test(c) && !localStorage.getItem("ge-canal")) localStorage.setItem("ge-canal", c);
    } catch { /* sem armazenamento: o cadastro segue sem canal */ }
  }, []);
  return null;
}
