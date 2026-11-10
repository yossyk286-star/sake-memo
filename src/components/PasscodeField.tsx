"use client";

import { useEffect, useId, useState } from "react";
import { tr } from "@/lib/i18n";

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
}: {
  value: string;
  onChange: (v: string) => void;
  /** 何をするのに合言葉が要るか（1行） */
  need: string;
  /** 合言葉がなくても使えるもの */
  free: string[];
  /** 合言葉が要る操作をしたとき、呼び出し側から開く */
  forceOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

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
          <p>{tr("写真や名前を調べるのに AI を使っていて、使うたびにお金がかかるので、合言葉を知っている人だけにしています。このアプリを教えてくれた人に聞いてみてください。")}</p>
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
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
