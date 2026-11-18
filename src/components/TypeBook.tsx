"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { kindColor } from "@/components/RecordCard";
import { KINDS, STYLES_BY_KIND } from "@/lib/glossary";
import { tr, trv } from "@/lib/i18n";
import type { Kind, TastingRecord } from "@/lib/types";

/** 好み画面（マイコレクション）の「タイプ図鑑」。タイプをマス目にして、飲んだものが色づく（19） */
export default function TypeBook({ records }: { records: TastingRecord[] }) {
  // 種類ごと、タイプごとの飲んだ数
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) if (r.kind && r.style) m.set(`${r.kind}/${r.style}`, (m.get(`${r.kind}/${r.style}`) ?? 0) + 1);
    return m;
  }, [records]);
  // いちばん多く飲んでいる種類から開く
  const first = useMemo(() => {
    const n = new Map<Kind, number>();
    for (const r of records) if (r.kind) n.set(r.kind, (n.get(r.kind) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "日本酒";
  }, [records]);
  const [picked, setPicked] = useState<Kind | null>(null);
  const kind = picked ?? first;
  const styles = STYLES_BY_KIND[kind];
  const got = styles.filter((s) => counts.has(`${kind}/${s}`)).length;

  return (
    <section className="card type-book" aria-label={tr("タイプ図鑑")} style={{ "--kind": kindColor(kind) } as React.CSSProperties}>
      <div className="type-book-head">
        <h2>{tr("タイプ図鑑")}</h2>
        <span className="muted">{tr("{0} / {1}", got, styles.length)}</span>
      </div>
      <div className="type-book-kinds" role="group" aria-label={tr("種類")}>
        {KINDS.map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={k === kind} onClick={() => setPicked(k)}>
            {trv(k)}
          </button>
        ))}
      </div>
      <ul className="type-grid">
        {styles.map((s) => {
          const n = counts.get(`${kind}/${s}`) ?? 0;
          return (
            <li key={s} data-got={n > 0 ? "" : undefined}>
              {n > 0 ? (
                <Link href={`/glossary?q=${encodeURIComponent(s)}`} aria-label={tr("{0}：{1}杯", s, n)}>
                  {trv(s)}
                  <small>{n}</small>
                </Link>
              ) : (
                <span>{trv(s)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
