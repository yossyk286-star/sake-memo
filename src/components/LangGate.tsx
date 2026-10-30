"use client";

import { useLayoutEffect, useState } from "react";
import { detectLang, initLang } from "@/lib/i18n";

/**
 * 言語（日本語・英語）を決めてから中身を出す。言語はスマホの設定か、設定画面で選んだもの。
 * 途中で言語が変わってちらつかないよう、決まるまでは何も出さない（起動画面と背景色だけ見える）
 */
export default function LangGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const lang = detectLang();
    // 日本語は訳を読み込まないので、その場で出す（白い画面を挟まない）
    if (lang === "ja") {
      initLang(lang);
      setReady(true);
    } else initLang(lang).then(() => setReady(true));
  }, []);
  return ready ? children : null;
}
