"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BuddyFace from "./BuddyFace";
import { listRecords } from "@/lib/db";
import { t, WELCOME, WELCOME_EVENT } from "@/lib/guide";
import { tr } from "@/lib/i18n";

const KEY = "sake-memo:welcome-seen";

/** 初めて開いたときの説明。記録がまだない人に1回だけ出す。使い方の画面からもう一度出せる */
export default function Welcome() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {}
    // 前から使っている人（記録がある人）には出さない
    if (!seen) listRecords().then((rs) => (rs.length === 0 ? setOpen(true) : close()));
    const again = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(WELCOME_EVENT, again);
    return () => window.removeEventListener(WELCOME_EVENT, again);
  }, []);

  useEffect(() => {
    // 読み上げで最初から読まれるよう、開いたら説明の箱にフォーカスを移す
    if (open) boxRef.current?.focus();
  }, [open, step]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  if (!open) return null;
  const last = step === WELCOME.length - 1;
  const page = WELCOME[step];

  return (
    <div className="welcome-backdrop">
      <div ref={boxRef} tabIndex={-1} className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <BuddyFace mood={last ? "happy" : "normal"} size={64} />
        <h2 id="welcome-title">{t(page.title)}</h2>
        <p>{t(page.body)}</p>
        <div className="welcome-dots" aria-label={tr("{0} / {1}", step + 1, WELCOME.length)}>
          {WELCOME.map((_, i) => (
            <i key={i} aria-current={i === step ? "step" : undefined} />
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={() => (last ? close() : setStep(step + 1))}>
          {last ? tr("はじめる") : tr("次へ")}
        </button>
        {last ? (
          <Link href="/guide" className="welcome-sub" onClick={close}>
            {tr("使い方をくわしく見る")}
          </Link>
        ) : (
          <button type="button" className="welcome-sub" onClick={close}>
            {tr("スキップ")}
          </button>
        )}
      </div>
    </div>
  );
}
