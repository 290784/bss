"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

/** Visível na tela (e aba ativa) — animações automáticas só rodam quando alguém pode vê-las. */
export function useInView(ref: RefObject<Element | null>, threshold = 0.25, onEnter?: () => void) {
  const [intersecting, setIntersecting] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const enter = useRef(onEnter);
  useEffect(() => { enter.current = onEnter; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let wasIn = false, tabWasHidden = false;
    const io = new IntersectionObserver(([e]) => {
      const now = !!e?.isIntersecting;
      if (now && !wasIn) enter.current?.();
      wasIn = now;
      setIntersecting(now);
    }, { threshold });
    io.observe(el);
    const onVis = () => {
      const visible = document.visibilityState === "visible";
      // Voltou para a aba com o elemento na tela: conta como "voltou para a tela".
      if (visible && tabWasHidden && wasIn) enter.current?.();
      tabWasHidden = !visible;
      setTabVisible(visible);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [ref, threshold]);
  return intersecting && tabVisible;
}
