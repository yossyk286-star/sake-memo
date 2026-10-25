"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { summarize, type GroupAverage } from "@/lib/analysis";
import { collectStamps } from "@/lib/origins";
import { listRecords, listWishes } from "@/lib/db";
import { groupByShop } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";

const MIN_RECORDS = 5;

function Bars({ title, rows }: { title: string; rows: GroupAverage[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="card" style={{ gap: 12 }}>
      <h2 style={{ fontSize: 14 }}>{title}</h2>
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <span>{r.label}</span>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${(r.average / 5) * 100}%` }} />
          </div>
          <span className="bar-value">
            {r.average.toFixed(1)}
            <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
              {" "}
              ({r.count})
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}

export default function TastePage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [wishCount, setWishCount] = useState(0);

  useEffect(() => {
    listRecords().then(setRecords);
    listWishes().then((ws) => setWishCount(ws.length));
  }, []);

  const stampInfo = useMemo(() => collectStamps(records ?? []), [records]);
  const shopCount = useMemo(() => groupByShop(records ?? []).length, [records]);

  const count = records?.length ?? 0;
  const summary = useMemo(() => (records && count >= MIN_RECORDS ? summarize(records) : null), [records, count]);

  return (
    <>
      <header className="page-header">
        <h1>好み</h1>
      </header>
      {summary && <p className="lead">記録 {count}件から。数字は総合の平均（カッコ内は件数）です。</p>}
      <main className="content">
        <nav className="hub" aria-label="記録のまとめ">
          <Link href="/stamps" className="hub-item">
            <strong>産地スタンプ帳</strong>
            <span className="muted">
              {stampInfo.stamps.size} / {stampInfo.total}か所
            </span>
          </Link>
          <Link href="/shops" className="hub-item">
            <strong>お店</strong>
            <span className="muted">{shopCount}軒</span>
          </Link>
          <Link href="/wishlist" className="hub-item">
            <strong>気になるお酒</strong>
            <span className="muted">{wishCount}件</span>
          </Link>
          <Link href="/prefs" className="hub-item">
            <strong>わたしの好み</strong>
            <span className="muted">自分で登録</span>
          </Link>
        </nav>
        {records && !summary && (
          <p className="empty">
            記録が{MIN_RECORDS}件たまると、あなたの好みの傾向を表示します。
            <br />
            いま {count}件 / あと {MIN_RECORDS - count}件
          </p>
        )}
        {summary && (
          <>
            <section className="highlight">
              <span style={{ fontSize: 12, opacity: 0.85 }}>いまの傾向</span>
              {summary.bestCombo ? (
                <p className="highlight-main">{summary.bestCombo.label} の評価が高めです</p>
              ) : (
                <p className="highlight-main">同じタイプと飲み方の組み合わせが2件以上たまると、ここに出ます</p>
              )}
            </section>
            <Bars title="種類ごと" rows={summary.byKind} />
            <Bars title="タイプごと" rows={summary.byStyle} />
            <Bars title="飲み方ごと" rows={summary.byServe} />
            <Bars title="産地ごと（2杯以上）" rows={summary.byOrigin} />
            {summary.topFlavors.length > 0 && (
              <section className="card">
                <h2 style={{ fontSize: 14 }}>よく感じる味</h2>
                <div className="tags">
                  {summary.topFlavors.map((f) => (
                    <span key={f.label} className="tag" style={{ fontSize: 13 }}>
                      {f.label} ×{f.count}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
