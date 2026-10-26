"use client";

import { useEffect, useState } from "react";

const KEY = "sake-memo:hints-seen";

function seen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** 使い方の説明。「わかった」を押したら、次からは出さない */
export default function Hint({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  // 読み込むまでは出さない（一瞬出て消えるのを防ぐ）
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(seen().includes(id)), [id]);
  if (hidden) return null;
  return (
    <div className={`hint ${className ?? ""}`}>
      <p>{children}</p>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, JSON.stringify([...seen(), id]));
          } catch {}
        }}
      >
        わかった
      </button>
    </div>
  );
}
