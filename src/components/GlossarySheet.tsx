"use client";

import Link from "next/link";
import { useEffect } from "react";
import { termsOf, type GlossaryCategory } from "@/lib/glossary";
import { getLang, tr, trv } from "@/lib/i18n";

const TITLES: Record<GlossaryCategory, string> = {
  日本酒: "日本酒のタイプ",
  ワイン: "ワインのタイプ",
  ビール: "ビールのタイプ",
  ウイスキー: "ウイスキーのタイプ",
  焼酎: "焼酎のタイプ",
  その他: "そのほかのお酒",
  飲み方: "飲み方とは",
  味の表現: "味の表現",
};

/** 入力フォームの「?」から開く、その場で読める用語説明 */
export default function GlossarySheet({
  category,
  onClose,
}: {
  category: GlossaryCategory;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="sheet-title">{trv(TITLES[category])}</h2>
          <button className="icon-btn" aria-label={tr("閉じる")} onClick={onClose} autoFocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {termsOf(category).map((t) => (
          <div className="term" key={t.term}>
            <span className="term-name">
              {trv(t.term)}
              {getLang() === "ja" && t.reading && tr("（{0}）", t.reading)}
            </span>
            <p className="term-desc">{trv(t.description)}</p>
          </div>
        ))}
        <Link href="/glossary" style={{ fontSize: 13 }}>
          {tr("辞典でほかの用語も見る ›")}
        </Link>
      </section>
    </div>
  );
}
