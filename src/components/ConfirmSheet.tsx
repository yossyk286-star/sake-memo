"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { markSheetOrigin } from "@/lib/sheetDepth";
import { tr } from "@/lib/i18n";

/** 消す前の確認（iPhone のアクションシートの形）。ブラウザの confirm() の代わり */
type Ask = {
  /** 何を消すか（マーク＋名前、写真など）。なければ出さない */
  preview?: ReactNode;
  /** 小さな説明文 */
  message: string;
  /** 赤いボタンの文字（「この記録を削除」など） */
  action: string;
  /** いくつかの中から選ぶとき（⋯ のメニュー）。danger は赤い文字 */
  choices?: { label: string; danger?: boolean }[];
};

/** 押したボタンの番号。やめる・外を押したら -1 */
type Pending = Ask & { resolve: (n: number) => void };

let open: ((p: Pending) => void) | null = null;

/** 確認シートを出して、押した方を返す（削除 = true、やめる = false） */
export function askConfirm(ask: Ask): Promise<boolean> {
  return new Promise((resolve) => {
    if (open) open({ ...ask, resolve: (n) => resolve(n === 0) });
    // 画面の準備ができる前に呼ばれたときだけ、ブラウザの確認に戻す
    else resolve(window.confirm(ask.message));
  });
}

/** いくつかの操作から選ぶシート（53）。押した番号を返し、やめたら -1 */
export function askChoice(preview: ReactNode, choices: { label: string; danger?: boolean }[]): Promise<number> {
  return new Promise((resolve) => {
    if (open) open({ preview, message: "", action: "", choices, resolve });
    else resolve(-1);
  });
}

/** layout に1つだけ置く */
export default function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    open = (next) => {
      markSheetOrigin();
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && done(-1);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  function done(n: number) {
    if (!p || closing) return;
    p.resolve(n);
    setClosing(true);
    // 下へ引っこむ動きを見せてから消す
    setTimeout(() => {
      setP(null);
      setClosing(false);
    }, 180);
  }

  if (!p) return null;
  return (
    <div className={`confirm-backdrop${closing ? " is-closing" : ""}`} onClick={() => done(-1)}>
      <div className="confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-box">
          <div className="confirm-head">
            {p.preview && <div className="confirm-preview">{p.preview}</div>}
            {p.message && <p id="confirm-msg">{p.message}</p>}
          </div>
          {p.choices ? (
            p.choices.map((c, i) => (
              <button key={c.label} type="button" className={c.danger ? "confirm-action" : "confirm-action is-plain"} onClick={() => done(i)}>
                {c.label}
              </button>
            ))
          ) : (
            <button type="button" className="confirm-action" onClick={() => done(0)}>
              {p.action}
            </button>
          )}
        </div>
        <button type="button" ref={cancelRef} className="confirm-cancel" onClick={() => done(-1)}>
          {tr("やめる")}
        </button>
      </div>
    </div>
  );
}
