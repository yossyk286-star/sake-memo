import Link from "next/link";
import type { TastingRecord } from "@/lib/types";

export function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 一覧や詳細の見出し。銘柄がなければ蔵元、それもなければ種類とタイプ */
export function drinkTitle(r: Pick<TastingRecord, "name" | "maker" | "kind" | "style">) {
  return r.name || r.maker || [r.kind, r.style].filter(Boolean).join(" ") || "（名前なし）";
}

export function yen(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 「2026-10-25」→「10/25」。今年以外は年も出す */
function shortDate(date: string) {
  const [y, m, d] = date.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  return Number(y) === new Date().getFullYear() ? md : `${y}/${md}`;
}

export default function RecordCard({ record: r }: { record: TastingRecord }) {
  const tags = [r.kind, r.style, r.serve, r.origin].filter(Boolean);
  return (
    <Link href={`/record?id=${r.id}`} className="card">
      <div className="card-top">
        <h2>{drinkTitle(r)}</h2>
        <span className="muted">{shortDate(r.date)}</span>
      </div>
      <p className="muted">{[r.shop, r.name && r.maker, r.price && yen(r.price)].filter(Boolean).join("・")}</p>
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ alignItems: "center", fontSize: 13 }}>
        <span className="muted">総合</span>
        <span className="stars" aria-label={`5段階中${r.overall}`}>
          {stars(r.overall)}
        </span>
        {r.flavors.length > 0 && <span className="muted">{r.flavors.join("・")}</span>}
      </div>
    </Link>
  );
}
