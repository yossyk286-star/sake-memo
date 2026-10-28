"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import RecordCard, { drinkTitle, stars, yen } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { groupByShop, mapsUrl } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";

/** 値段を入れた記録があれば「・平均 800円」 */
function priceNote(records: TastingRecord[]) {
  const prices = records.flatMap((r) => (r.price ? [r.price] : []));
  return prices.length ? `・1杯 平均 ${yen(prices.reduce((a, b) => a + b, 0) / prices.length)}` : "";
}

function ShopBody() {
  const name = useSearchParams().get("name") ?? "";
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const shop = useMemo(() => groupByShop(records ?? []).find((s) => s.name === name), [records, name]);
  const shopMap = mapsUrl(name);

  return (
    <>
      <header className="sub-header">
        <Link href="/shops" className="back">
          ‹ 戻る
        </Link>
        <h1>{name}</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {records && !shop && <p className="empty">このお店の記録はありません。</p>}
        {shop && (
          <>
            <section className="highlight">
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>このお店でいちばんおいしかったお酒</p>
              <p className="highlight-main">{drinkTitle(shop.best)}</p>
              <span aria-label={`5段階中${shop.best.overall}`}>{stars(shop.best.overall)}</span>
            </section>
            <p className="muted" style={{ margin: 0 }}>
              {shop.records.length}杯の記録
              {priceNote(shop.records)}
            </p>
            {shopMap && (
              <a href={shopMap} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Google マップで開く
              </a>
            )}
            {shop.records.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </>
        )}
      </main>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopBody />
    </Suspense>
  );
}
