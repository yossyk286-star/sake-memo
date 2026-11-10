"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { tr } from "@/lib/i18n";

/** 消す前の確認（iPhone のアクションシートの形）。ブラウザの confirm() の代わり */
type Ask = {
  /** 何を消すか（マーク＋名前、写真など）。なければ出さない */
  preview?: ReactNode;
  /** 小さな説明文 */
  message: string;
  /** 赤いボタンの文字（「この記録を削除」など） */
  action: string;
};

type Pending = Ask & { resolve: (ok: boolean) => void };

let open: ((p: Pending) => void) | null = null;

/** 確認シートを出して、押した方を返す（削除 = true、やめる = false） */
export function askConfirm(ask: Ask): Promise<boolean> {
  return new Promise((resolve) => {
    if (open) open({ ...ask, resolve });
    // 画面の準備ができる前に呼ばれたときだけ、ブラウザの確認に戻す
    else resolve(window.confirm(ask.message));
  });
}

/** layout に1つだけ置く */
export default function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    open = (next) => {
      setClosing(false);
      setP(next);
    };
    return () => {
      open = null;
    };
  }, []);

  useEffect(() => {
    if (!p) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && done(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  function done(ok: boolean) {
    if (!p || closing) return;
    p.resolve(ok);
    setClosing(true);
    // 下へ引っこむ動きを見せてから消す
    setTimeout(() => {
      setP(null);
      setClosing(false);
    }, 180);
  }

  if (!p) return null;
  return (
    <div className={`confirm-backdrop${closing ? " is-closing" : ""}`} onClick={() => done(false)}>
      <div
        className="confirm-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-box">
          <div className="confirm-head">
            {p.preview && <div className="confirm-preview">{p.preview}</div>}
            <p id="confirm-msg">{p.message}</p>
          </div>
          <button type="button" className="confirm-action" onClick={() => done(true)}>
            {p.action}
          </button>
        </div>
        <button type="button" ref={cancelRef} className="confirm-cancel" onClick={() => done(false)}>
          {tr("やめる")}
        </button>
      </div>
    </div>
  );
}
