"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { kindColor } from "@/components/RecordCard";
import SwipeRecord from "@/components/SwipeRecord";
import { listRecords } from "@/lib/db";
import { KINDS } from "@/lib/glossary";
import type { Kind, TastingRecord } from "@/lib/types";

const WEEKDAYS = "日月火水木金土";

/** 「2026-10-25」→「10月25日（日）」。今年以外は年も出す */
function dateHead(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const md = `${m}月${d}日（${w}）`;
  return y === new Date().getFullYear() ? md : `${y}年${md}`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const [goodOnly, setGoodOnly] = useState(false);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  // 種類・★4以上・名前などで絞り込み、日付ごとにまとめる（記録は新しい順に並んでいる）
  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (records ?? []).filter(
      (r) =>
        (!kind || r.kind === kind) &&
        (!goodOnly || r.overall >= 4) &&
        (!q ||
          [r.name, r.maker, r.shop, r.origin, r.style ?? "", r.memo, ...r.flavors].some((s) =>
            s.toLowerCase().includes(q),
          )),
    );
    const out: { date: string; records: TastingRecord[] }[] = [];
    for (const r of hit) {
      const last = out[out.length - 1];
      if (last?.date === r.date) last.records.push(r);
      else out.push({ date: r.date, records: [r] });
    }
    return out;
  }, [records, query, kind, goodOnly]);

  const filtering = !!query.trim() || !!kind || goodOnly;
  const kindsUsed = KINDS.filter((k) => records?.some((r) => r.kind === k));

  return (
    <>
      <header className="page-header">
        <h1>さけメモ</h1>
        <Link href="/settings" className="icon-btn" aria-label="設定">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
          </svg>
        </Link>
      </header>

      {records && records.length > 0 && (
        <p className="lead">これまでの記録 {records.length}件（左にスライドで削除、右で編集）</p>
      )}

      <main className="content" style={{ paddingBottom: 96 }}>
        {records && records.length > 0 && (
          <div className="filter-bar">
            <label htmlFor="r-search" className="visually-hidden">
              記録を検索
            </label>
            <input
              id="r-search"
              type="search"
              className="input"
              placeholder="名前・店・味で探す"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="scroll-row" role="group" aria-label="絞り込み">
              <button type="button" className="chip" aria-pressed={goodOnly} onClick={() => setGoodOnly(!goodOnly)}>
                ★4以上
              </button>
              {kindsUsed.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip kind-chip"
                  style={{ "--kc": kindColor(k) } as React.CSSProperties}
                  aria-pressed={kind === k}
                  onClick={() => setKind(kind === k ? null : k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
        {records?.length === 0 && (
          <p className="empty">
            まだ記録がありません。
            <br />
            下の「調べる」でお酒を調べるか、「記録する」から残してみましょう。
          </p>
        )}
        {records && records.length > 0 && filtering && days.length === 0 && (
          <p className="empty">当てはまる記録がありません。</p>
        )}
        {days.map((day) => (
          <section key={day.date} className="content" style={{ padding: 0, gap: 8 }}>
            <h2 className="date-head">{dateHead(day.date)}</h2>
            {day.records.map((r) => (
              <SwipeRecord
                key={r.id}
                record={r}
                showDate={false}
                onDeleted={(id) => setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)}
              />
            ))}
          </section>
        ))}
      </main>

      <Link href="/new" className="fab">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        記録する
      </Link>
    </>
  );
}
