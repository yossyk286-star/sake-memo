"use client";

import { useEffect, useRef, useState } from "react";
import BuddyFace from "./BuddyFace";
import Tour from "./Tour";
import { listRecords } from "@/lib/db";
import { startTour, t, WELCOME } from "@/lib/guide";
import { tr } from "@/lib/i18n";

const KEY = "sake-memo:welcome-seen";

/**
 * 初めて開いたときのあいさつ。記録がまだない人に1回だけ出し、そのまま画面の上の案内（Tour）に進む。
 * 案内そのものは Tour が受け持つので、ここに一緒に置いておく
 */
export default function Welcome() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {}
    // 前から使っている人（記録がある人）には出さない
    if (!seen) listRecords().then((rs) => (rs.length === 0 ? setOpen(true) : close()));
  }, []);

  useEffect(() => {
    // 読み上げで最初から読まれるよう、開いたら説明の箱にフォーカスを移す
    if (open) boxRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <>
      {open && (
        <div className="welcome-backdrop">
          <div ref={boxRef} tabIndex={-1} className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <BuddyFace mood="happy" size={64} />
            <h2 id="welcome-title">{t(WELCOME.title)}</h2>
            <p>{t(WELCOME.body)}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                close();
                startTour("home");
              }}
            >
              {tr("画面で案内を見る")}
            </button>
            <button type="button" className="welcome-sub" onClick={close}>
              {tr("スキップ")}
            </button>
          </div>
        </div>
      )}
      <Tour />
    </>
  );
}
