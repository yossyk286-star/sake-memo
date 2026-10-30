"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BuddyFace from "./BuddyFace";
import { announceBuddy, BUDDY_EVENT, openLine, type BuddyLine } from "@/lib/buddy";
import { listRecords } from "@/lib/db";
import { tr, trv } from "@/lib/i18n";

/** 相棒が画面の下から出てきてひとこと言う。タップで消える。記録の保存やアプリを開いたときなどに出る */
export default function Buddy() {
  const [line, setLine] = useState<(BuddyLine & { key: number }) | null>(null);
  const path = usePathname();

  useEffect(() => {
    const onLine = (e: Event) => setLine({ ...(e as CustomEvent<BuddyLine>).detail, key: Date.now() });
    window.addEventListener(BUDDY_EVENT, onLine);
    return () => window.removeEventListener(BUDDY_EVENT, onLine);
  }, []);

  // アプリを開いたとき（起動画面が消えたあと）に1回だけ。店員さんに見せている最中は出さない
  useEffect(() => {
    if (path === "/show") return;
    const t = setTimeout(() => listRecords().then((rs) => {
      const l = openLine(rs);
      if (l) announceBuddy(l);
    }), 1600);
    return () => clearTimeout(t);
    // 開いたときの1回だけでよいので path は見ない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 読み終わるくらいの時間で引っこむ。リンクがあるときは押す時間も取る
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), Math.max(line.action ? 7000 : 4000, line.text.length * 140));
    return () => clearTimeout(t);
  }, [line]);

  if (!line) return null;
  const close = () => setLine(null);
  return (
    <div key={line.key} className={`buddy buddy-${line.mood}`}>
      <BuddyFace mood={line.mood} size={62} />
      <div className="buddy-bubble" role="status">
        <button type="button" className="buddy-text" onClick={close} aria-label={tr("相棒：{0}（タップで閉じる）", line.text)}>
          {trv(line.text)}
        </button>
        {line.action && (
          <Link href={line.action.href} className="buddy-action" onClick={close}>
            {trv(line.action.label)} ›
          </Link>
        )}
      </div>
    </div>
  );
}
