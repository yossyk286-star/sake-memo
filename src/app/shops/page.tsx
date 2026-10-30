"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { groupByShop } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { tr, trv } from "@/lib/i18n";

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
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("お店")}</h1>
      </header>

      {shops.length > 0 && <p className="lead">{tr("行ったお店 {0}軒（最近行った順）", shops.length)}</p>}

      <main className="content">
        {records && shops.length === 0 && (
          <EmptyState title={tr("行ったお店、まだないよ")} actions={[{ href: "/new", label: tr("記録する") }]}>
            {tr("記録に「お店」を書いておくと、ここにお店ごとにまとまるよ。")}
          </EmptyState>
        )}
        {shops.map((s) => (
          <Link key={s.name} href={`/shop?name=${encodeURIComponent(s.name)}`} className="card">
            <div className="card-top">
              <h2>{trv(s.name)}</h2>
              <span className="muted">{tr("{0}杯", s.records.length)}</span>
            </div>
            <p className="muted">{tr("いちばん：{0}", drinkTitle(s.best))}</p>
            <span className="stars" aria-label={tr("5段階中{0}", s.best.overall)} style={{ fontSize: 13 }}>
              {stars(s.best.overall)}
            </span>
          </Link>
        ))}
      </main>
    </>
  );
}
