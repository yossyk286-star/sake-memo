"use client";

import { useEffect } from "react";

/**
 * 畳んだ段（details）を、パッとではなく高さをするっと伸び縮みさせて開け閉めする。
 * 画面ぜんぶの summary の押下をここで受けるので、各画面は今まで通り details を置くだけでよい。
 * 「動きを減らす」設定の人は今まで通りすぐ開け閉めする
 */
export default function SmoothDetails() {
  useEffect(() => {
    const running = new WeakMap<HTMLDetailsElement, Animation>();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const target = e.target as Element | null;
      const summary = target?.closest?.("summary");
      const d = summary?.parentElement;
      if (!summary || !(d instanceof HTMLDetailsElement) || d.querySelector(":scope > summary") !== summary) return;
      // summary の中のボタンやリンクは、それぞれの動きに任せる
      if (target !== summary && target?.closest("a, button, input, select, textarea, label")) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || typeof d.animate !== "function") return;
      e.preventDefault();

      const closing = d.open && !("closing" in d.dataset);
      const from = d.getBoundingClientRect().height;
      running.get(d)?.cancel();
      let to: number;
      if (closing) {
        // 閉じたときの高さを測るために一瞬だけ閉じる（描画はされない）
        d.open = false;
        to = d.getBoundingClientRect().height;
        d.open = true;
        d.dataset.closing = "";
      } else {
        delete d.dataset.closing;
        d.open = true;
        to = d.getBoundingClientRect().height;
      }
      d.style.overflow = "hidden";
      const a = d.animate({ height: [`${from}px`, `${to}px`] }, { duration: closing ? 220 : 280, easing: "cubic-bezier(0.3, 0.8, 0.3, 1)" });
      running.set(d, a);
      const done = () => {
        if (running.get(d) !== a) return;
        running.delete(d);
        d.style.overflow = "";
        if (closing) {
          d.open = false;
          delete d.dataset.closing;
        }
      };
      a.onfinish = done;
      a.oncancel = () => {
        if (running.get(d) === a) {
          running.delete(d);
          d.style.overflow = "";
        }
      };
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
