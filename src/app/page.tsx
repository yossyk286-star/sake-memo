"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SwipeRecord from "@/components/SwipeRecord";
import { listRecords } from "@/lib/db";
import { loadLastScan } from "@/lib/lastScan";
import type { TastingRecord } from "@/lib/types";

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [todayDrinks, setTodayDrinks] = useState(0);

  useEffect(() => {
    setTodayDrinks(loadLastScan()?.drinks.length ?? 0);
    listRecords().then(setRecords);
  }, []);

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
        {/* お店でメニューを見たらすぐ撮って確認できるように、一覧のいちばん上に置く */}
        <Link href="/scan" className="btn-primary scan-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {todayDrinks > 0 ? `今日調べたお酒を見る（${todayDrinks}種類）` : "メニュー・ラベルを撮る／名前で調べる"}
        </Link>
        {records?.length === 0 && (
          <p className="empty">
            まだ記録がありません。
            <br />
            お店で飲んだら「記録する」から残してみましょう。
          </p>
        )}
        {records?.map((r) => (
          <SwipeRecord
            key={r.id}
            record={r}
            onDeleted={(id) => setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)}
          />
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
