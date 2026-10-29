import { useEffect, useRef, useState } from "react";

const parse = (v: string) => v.split(" ").map(Number);

/** 地図の viewBox を目当ての範囲へなめらかに動かす（寄る・引くをアニメーションにする） */
export function useViewBox(target: string, ms = 380) {
  const [box, setBox] = useState(target);
  const current = useRef(parse(target));
  useEffect(() => {
    const from = current.current;
    const to = parse(target);
    if (from.every((n, i) => n === to[i])) return;
    // 動きを減らす設定なら、すぐ切り替える
    const instant = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      const v = from.map((n, i) => n + (to[i] - n) * e);
      current.current = v;
      setBox(v.map((n) => n.toFixed(1)).join(" "));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return box;
}

/** 四角（"x y w h"）を、まわりも少し見えるように広げ、地図と同じ縦横比にそろえる */
export function fitBox(box: string, ratio: number, minWidth: number, pad = 0.35) {
  const [x, y, w, h] = parse(box);
  let W = Math.max(w * (1 + pad * 2), minWidth);
  let H = Math.max(h * (1 + pad * 2), W / ratio);
  W = Math.max(W, H * ratio);
  H = W / ratio;
  return `${Math.round(x + w / 2 - W / 2)} ${Math.round(y + h / 2 - H / 2)} ${Math.round(W)} ${Math.round(H)}`;
}
