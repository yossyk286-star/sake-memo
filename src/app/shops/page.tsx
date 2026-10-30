"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { groupByShop } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";

/** 行ったお店の一覧と、その店でいちばんおいしかったお酒 */
export default function ShopsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const shops = useMemo(() => groupByShop(records ?? []), [records]);

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>お店</h1>
      </header>

      {shops.length > 0 && <p className="lead">行ったお店 {shops.length}軒（最近行った順）</p>}

      <main className="content">
        {records && shops.length === 0 && (
          <EmptyState title="行ったお店、まだないよ" actions={[{ href: "/new", label: "記録する" }]}>
            記録に「お店」を書いておくと、ここにお店ごとにまとまるよ。
          </EmptyState>
        )}
        {shops.map((s) => (
          <Link key={s.name} href={`/shop?name=${encodeURIComponent(s.name)}`} className="card">
            <div className="card-top">
              <h2>{s.name}</h2>
              <span className="muted">{s.records.length}杯</span>
            </div>
            <p className="muted">いちばん：{drinkTitle(s.best)}</p>
            <span className="stars" aria-label={`5段階中${s.best.overall}`} style={{ fontSize: 13 }}>
              {stars(s.best.overall)}
            </span>
          </Link>
        ))}
      </main>
    </>
  );
}
