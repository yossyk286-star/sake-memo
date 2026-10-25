"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { drinkTitle, stars, yen } from "@/components/RecordCard";
import TasteMap from "@/components/TasteMap";
import { summarize, type GroupAverage } from "@/lib/analysis";
import { collectStamps } from "@/lib/origins";
import { listRecords, listWishes } from "@/lib/db";
import { nextIdeas } from "@/lib/nextDrink";
import { loadPrefs } from "@/lib/prefs";
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

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 値段を入れた記録の平均と、安くて評価の高かったお酒 */
function PriceCard({ records }: { records: TastingRecord[] }) {
  const priced = records.filter((r) => r.price);
  if (priced.length === 0) return null;
  const liked = priced.filter((r) => r.overall >= 4);
  // 評価が高い順、同じなら安い順
  const bargain = [...liked].sort((a, b) => b.overall - a.overall || a.price! - b.price!)[0];
  return (
    <section className="card" style={{ gap: 6 }}>
      <h2 style={{ fontSize: 14 }}>値段</h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        1杯の平均 <strong>{yen(average(priced.map((r) => r.price!)))}</strong>
        <span className="muted">（{priced.length}杯）</span>
      </p>
      {liked.length > 0 && (
        <p style={{ margin: 0, fontSize: 14 }}>
          ★4以上だったお酒の平均 <strong>{yen(average(liked.map((r) => r.price!)))}</strong>
        </p>
      )}
      {bargain && (
        <p style={{ margin: 0, fontSize: 14 }}>
          お値打ちだったお酒：
          <Link href={`/record?id=${bargain.id}`}>
            {drinkTitle(bargain)}（{stars(bargain.overall)}・{yen(bargain.price!)}）
          </Link>
        </p>
      )}
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

  const ideas = useMemo(() => (records ? nextIdeas(records, loadPrefs()) : []), [records]);

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
        {ideas.length > 0 && (
          <section className="tips">
            <h2>次の一杯に</h2>
            <ul className="next-list">
              {ideas.map((i) => (
                <li key={i.title}>
                  <strong>{i.title}</strong>
                  <span>{i.reason}</span>
                  {i.description && <span className="muted">{i.description}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {records && records.length > 0 && <TasteMap records={records} />}
        {records && <PriceCard records={records} />}
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
