"use client";

import { useEffect, useId, useRef, useState } from "react";
import { tr, trv } from "@/lib/i18n";

/**
 * 合言葉の欄。はじめての人には何のことか分からないので、ふだんは1行の案内だけにして、
 * 押すと「合言葉って？」の説明・入力欄・合言葉なしで使えるものを出す
 */
export default function PasscodeField({
  value,
  onChange,
  need,
  free,
  forceOpen = false,
  error = "",
}: {
  value: string;
  onChange: (v: string) => void;
  /** 何をするのに合言葉が要るか（1行） */
  need: string;
  /** 合言葉がなくても使えるもの */
  free: string[];
  /** 合言葉が要る操作をしたとき、呼び出し側から開く */
  forceOpen?: boolean;
  /** 合言葉の間違い・入れ忘れ。入力欄のすぐ下に出して、欄を赤くしてそこまで動かす */
  error?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  useEffect(() => {
    if (!error) return;
    // 下に浮かぶタブの裏に隠れないよう、欄を画面のまん中へ
    const t = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      inputRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [error]);

  return (
    <div className="pass-note">
      <p>
        <span aria-hidden="true">🔑 </span>
        {need}
        <button type="button" className="text-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? tr("閉じる") : tr("合言葉って？")}
        </button>
      </p>
      {open && (
        <div id={id} className="pass-body">
          <p>
            {tr(
              "写真や名前を調べるのに AI を使っていて、使うたびにお金がかかるので、合言葉を知っている人だけにしています。このアプリを教えてくれた人に聞いてみてください。",
            )}
          </p>
          <label className="label" htmlFor={`${id}-in`}>
            {tr("合言葉")}
          </label>
          <input
            id={`${id}-in`}
            className="input"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            ref={inputRef}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {error && (
            <p id={`${id}-err`} className="error pass-error" role="alert">
              {trv(error)}
            </p>
          )}
          <strong>{tr("合言葉がなくても使えます")}</strong>
          <ul>
            {free.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
