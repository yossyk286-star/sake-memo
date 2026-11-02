"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import { photosOf, usePhotoURLs } from "@/lib/photo";
import type { Kind, TastingRecord } from "@/lib/types";
import { getLang, tr, trJoin } from "@/lib/i18n";

/** 文の中で使う総合評価。「★4」「★3.5」のように数字で出す */
export function stars(n: number) {
  return `★${n}`;
}

/** 総合評価の★5つ。0.5 なら半分だけ塗る。空きも同じ★を薄く出す */
export function Stars({ n, color, className = "", label }: { n: number; color?: string; className?: string; label?: string }) {
  return (
    <span
      className={`stars ${className}`.trim()}
      role="img"
      aria-label={label ?? tr("5段階中{0}", n)}
      style={color ? ({ "--star": color } as CSSProperties) : undefined}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="star" style={{ "--f": `${Math.max(0, Math.min(1, n - i + 1)) * 100}%` } as CSSProperties}>
          ★
        </span>
      ))}
    </span>
  );
}

/** 一覧や詳細の見出し。銘柄がなければ蔵元、それもなければ種類とタイプ */
export function drinkTitle(r: Pick<TastingRecord, "name" | "maker" | "kind" | "style">) {
  return r.name || r.maker || [r.kind, r.style].filter(Boolean).map((s) => tr(s!)).join(" ") || tr("（名前なし）");
}

export function yen(n: number) {
  if (getLang() === "en") return `¥${Math.round(n).toLocaleString("en-US")}`;
  return tr("{0}円", Math.round(n).toLocaleString("ja-JP"));
}

/** 種類ごとの色（globals.css の --k-… ）と、写真がないときに出す1文字 */
const KIND_LOOK: Record<Kind, { color: string; mark: string; en: string }> = {
  日本酒: { color: "var(--k-sake)", mark: "日", en: "Sa" },
  ワイン: { color: "var(--k-wine)", mark: "ワ", en: "Wi" },
  ビール: { color: "var(--k-beer)", mark: "ビ", en: "Be" },
  ウイスキー: { color: "var(--k-whisky)", mark: "ウ", en: "Wh" },
  焼酎: { color: "var(--k-shochu)", mark: "焼", en: "Sh" },
  その他: { color: "var(--k-other)", mark: "他", en: "Ot" },
};

export function kindColor(kind: Kind | null) {
  return kind ? KIND_LOOK[kind].color : "var(--muted)";
}

/** 「2026-10-25」→「10/25」。今年以外は年も出す */
export function shortDate(date: string) {
  const [y, m, d] = date.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  return Number(y) === new Date().getFullYear() ? md : `${y}/${md}`;
}

/** 写真があれば小さく、なければ種類の色の四角に1文字 */
function Thumb({ record: r }: { record: TastingRecord }) {
  const first = useMemo(() => photosOf(r).slice(0, 1), [r]);
  const [url] = usePhotoURLs(first);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="thumb" style={{ borderColor: kindColor(r.kind) }} />;
  }
  return (
    <span className="thumb thumb-mark" style={{ background: kindColor(r.kind) }} aria-hidden="true">
      {r.kind ? KIND_LOOK[r.kind][getLang() === "en" ? "en" : "mark"] : tr("酒")}
    </span>
  );
}

/** 記録の一覧の1行。2行に詰めて、画面にたくさん並ぶようにする。showDate=false は日付で区切った一覧用 */
export default function RecordCard({ record: r, showDate = true }: { record: TastingRecord; showDate?: boolean }) {
  const sub = [
    trJoin([r.kind, r.style]),
    r.serve && tr(r.serve),
    r.shop && tr(r.shop),
    r.price && yen(r.price),
    showDate && shortDate(r.date),
  ].filter(Boolean);
  return (
    <Link href={`/record?id=${r.id}`} className="card record-row">
      <Thumb record={r} />
      <div className="record-row-body">
        <div className="record-row-top">
          <h2>{drinkTitle(r)}</h2>
          <Stars n={r.overall} />
        </div>
        <p className="muted">{sub.join(tr("・"))}</p>
      </div>
    </Link>
  );
}
