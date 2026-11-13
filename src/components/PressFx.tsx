"use client";

import { useEffect } from "react";

/**
 * 押した手ごたえ。
 * - iPhone の Safari は touchstart を聞いていないと :active が付かないので、空の聞き手を置く
 * - チップは押した指の位置を覚えて、そこから色が広がる（globals.css の .chip[data-ink]）
 */
export default function PressFx() {
  useEffect(() => {
    const noop = () => {};
    const onDown = (e: PointerEvent) => {
      const chip = (e.target as Element | null)?.closest?.(".chip");
      if (!(chip instanceof HTMLElement)) return;
      const r = chip.getBoundingClientRect();
      chip.style.setProperty("--ink-x", `${e.clientX - r.left}px`);
      chip.style.setProperty("--ink-y", `${e.clientY - r.top}px`);
      chip.style.setProperty("--ink-r", `${Math.hypot(r.width, r.height)}px`);
      // 続けて押したときだけ付け直して、はじめから広げる（毎回 offsetWidth で描き直させると、押した瞬間の1コマが重くなる）
      if (chip.hasAttribute("data-ink")) {
        chip.removeAttribute("data-ink");
        void chip.offsetWidth;
      }
      chip.setAttribute("data-ink", "");
      window.setTimeout(() => chip.removeAttribute("data-ink"), 500);
    };
    document.addEventListener("touchstart", noop, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      document.removeEventListener("touchstart", noop);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return null;
}
