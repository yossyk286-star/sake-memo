"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP } from "@/lib/appeal";
import { listRecords } from "@/lib/db";
import { tr } from "@/lib/i18n";

const KEY = `${APP.id}:install-seen`;

type InstallEvent = Event & { prompt: () => Promise<unknown> };

/**
 * ブラウザのまま使っている人に、ホーム画面に置く方法を1回だけ案内する。
 * 最初の1杯を記録したあと、記録の画面に戻ってきたときに出す（はじめての説明や画面の案内と重ならないように）
 */
export default function InstallHint() {
  const path = usePathname();
  const [mode, setMode] = useState<"ios" | "android" | null>(null);
  const prompt = useRef<InstallEvent | null>(null);

  useEffect(() => {
    // Android の Chrome は、この合図が来たときだけボタンでそのまま追加できる
    const keep = (e: Event) => {
      e.preventDefault();
      prompt.current = e as InstallEvent;
    };
    window.addEventListener("beforeinstallprompt", keep);
    return () => window.removeEventListener("beforeinstallprompt", keep);
  }, []);

  useEffect(() => {
    if (path !== "/") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let seen = true;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {}
    if (standalone || seen) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const android = /android/i.test(navigator.userAgent);
    if (!ios && !android) return;
    listRecords().then((rs) => {
      if (rs.length > 0 && !document.querySelector(".welcome-backdrop, .tour")) setMode(ios ? "ios" : "android");
    });
  }, [path]);

  if (!mode) return null;

  function close() {
    setMode(null);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <div className="welcome-backdrop">
      <div className="welcome install-hint" role="dialog" aria-modal="true" aria-labelledby="install-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={64} height={64} />
        <h2 id="install-title">{tr("ホーム画面に置いて使おう")}</h2>
        <p>{tr("画面いっぱいで開けて、お店でもすぐ撮れます。")}</p>
        {mode === "ios" ? (
          <ol>
            <li>{tr("画面の下（または上）の共有ボタン（四角から矢印）を押す")}</li>
            <li>{tr("「ホーム画面に追加」を選ぶ")}</li>
            <li>{tr("右上の「追加」を押す")}</li>
          </ol>
        ) : (
          <ol>
            <li>{tr("右上のメニュー（︙）を押す")}</li>
            <li>{tr("「ホーム画面に追加」を選ぶ")}</li>
          </ol>
        )}
        {mode === "android" && prompt.current ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              prompt.current?.prompt();
              close();
            }}
          >
            {tr("ホーム画面に追加")}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={close}>
            {tr("わかった")}
          </button>
        )}
        {mode === "android" && prompt.current && (
          <button type="button" className="welcome-sub" onClick={close}>
            {tr("あとで")}
          </button>
        )}
      </div>
    </div>
  );
}
