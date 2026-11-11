"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOAST_EVENT, type Toast } from "@/lib/toast";
import { trv } from "@/lib/i18n";

const ICON: Record<Toast["tone"], string> = { ok: "✓", star: "★", warn: "!" };
const SHOW_MS = 2200;
const OUT_MS = 300;

/** 上のふちから伸びる黒いカプセル。新しいお知らせが来たら入れ替える */
export default function Toaster() {
  const [t, setT] = useState<Toast | null>(null);
  const [out, setOut] = useState(false);
  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    let clear: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const next = (e as CustomEvent<Toast>).detail;
      clearTimeout(hide);
      clearTimeout(clear);
      setOut(false);
      setT(next);
      const ms = next.ms ?? (next.action ? SHOW_MS + 1300 : SHOW_MS);
      hide = setTimeout(() => setOut(true), ms);
      clear = setTimeout(() => setT((cur) => (cur?.id === next.id ? null : cur)), ms + OUT_MS);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => {
      window.removeEventListener(TOAST_EVENT, on);
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, []);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {t && (
        <div key={t.id} className="toast" data-out={out ? "" : undefined}>
          <span className="toast-icon" data-tone={t.tone} aria-hidden="true">
            {ICON[t.tone]}
          </span>
          <span className="toast-msg">{trv(t.message)}</span>
          {t.action &&
            ("href" in t.action ? (
              <Link href={t.action.href} className="toast-action" onClick={() => setOut(true)}>
                {trv(t.action.label)}
              </Link>
            ) : (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  setOut(true);
                  (t.action as { onClick: () => void }).onClick();
                }}
              >
                {trv(t.action.label)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
