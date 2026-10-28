"use client";

import { useEffect, useState } from "react";
import BuddyFace from "./BuddyFace";
import { BUDDY_EVENT, type BuddyLine } from "@/lib/buddy";

/** 記録を保存したときに、画面の下から相棒が出てきてひとこと言う。タップで消える */
export default function Buddy() {
  const [line, setLine] = useState<(BuddyLine & { key: number }) | null>(null);

  useEffect(() => {
    const onLine = (e: Event) => setLine({ ...(e as CustomEvent<BuddyLine>).detail, key: Date.now() });
    window.addEventListener(BUDDY_EVENT, onLine);
    return () => window.removeEventListener(BUDDY_EVENT, onLine);
  }, []);

  // 読み終わるくらいの時間で引っこむ
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), Math.max(4000, line.text.length * 140));
    return () => clearTimeout(t);
  }, [line]);

  if (!line) return null;
  return (
    <button
      key={line.key}
      type="button"
      className={`buddy buddy-${line.mood}`}
      onClick={() => setLine(null)}
      aria-label={`相棒：${line.text}（タップで閉じる）`}
    >
      <BuddyFace mood={line.mood} size={62} />
      <span className="buddy-bubble" role="status">
        {line.text}
      </span>
    </button>
  );
}
