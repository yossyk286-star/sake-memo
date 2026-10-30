"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { drinkTitle, stars, yen } from "@/components/RecordCard";
import TasteMap from "@/components/TasteMap";
import { summarize, type GroupAverage } from "@/lib/analysis";
import { collectStamps } from "@/lib/origins";
import { listBottles, listRecords, listWishes } from "@/lib/db";
import { nextIdeas } from "@/lib/nextDrink";
import { loadPrefs } from "@/lib/prefs";
import { groupByShop } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { tr, trv } from "@/lib/i18n";

const MIN_RECORDS = 5;

function Bars({ title, rows }: { title: string; rows: GroupAverage[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="card" style={{ gap: 12 }}>
      <h2 style={{ fontSize: 14 }}>{trv(title)}</h2>
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <span>{trv(r.label)}</span>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${(r.average / 5) * 100}%` }} />
          </div>
          <span className="bar-value">
            {r.average.toFixed(1)}
            <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
              {" "}
              ({trv(r.count)})
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
function PriceCard({ records, budget }: { records: TastingRecord[]; budget: number | null }) {
  const priced = records.filter((r) => r.price);
  if (priced.length === 0) return null;
  const liked = priced.filter((r) => r.overall >= 4);
  // 評価が高い順、同じなら安い順
  const bargain = [...liked].sort((a, b) => b.overall - a.overall || a.price! - b.price!)[0];
  return (
    <section className="card" style={{ gap: 6 }}>
      <h2 style={{ fontSize: 14 }}>{tr("値段")}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        {tr("1杯の平均")}{" "}<strong>{yen(average(priced.map((r) => r.price!)))}</strong>
        <span className="muted">{tr("（{0}杯）", priced.length)}</span>
      </p>
      {liked.length > 0 && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {tr("★4以上だったお酒の平均")}{" "}<strong>{yen(average(liked.map((r) => r.price!)))}</strong>
        </p>
      )}
      {budget && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {tr("予算 {0} 以内：{1} / {2}杯", yen(budget), priced.filter((r) => r.price! <= budget).length, priced.length)}
        </p>
      )}
      {bargain && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {tr("お値打ちだったお酒：")}
          <Link href={`/record?id=${bargain.id}`}>
            {tr("{0}（{1}・{2}）", drinkTitle(bargain), stars(bargain.overall), yen(bargain.price!))}
          </Link>
        </p>
      )}
    </section>
  );
}

export default function TastePage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [wishCount, setWishCount] = useState(0);
  const [bottleCount, setBottleCount] = useState(0);

  useEffect(() => {
    listRecords().then(setRecords);
    listWishes().then((ws) => setWishCount(ws.length));
    listBottles().then((bs) => setBottleCount(bs.filter((b) => !b.finished).length));
  }, []);

  const stampInfo = useMemo(() => collectStamps(records ?? []), [records]);
  const shopCount = useMemo(() => groupByShop(records ?? []).length, [records]);

  const ideas = useMemo(() => (records ? nextIdeas(records, loadPrefs()) : []), [records]);

  const count = records?.length ?? 0;
  const summary = useMemo(() => (records && count >= MIN_RECORDS ? summarize(records) : null), [records, count]);

  return (
    <>
      <header className="page-header">
        <h1>{tr("好み")}</h1>
      </header>
      {summary && <p className="lead">{tr("記録 {0}件から。数字は総合の平均（カッコ内は件数）です。", count)}</p>}
      <main className="content">
        <Link href="/show" className="hub-item hub-show">
          <strong>{tr("店員さんに見せる")}</strong>
          <span className="muted">{tr("好みを大きく表示して「こういうのください」")}</span>
        </Link>
        <nav className="hub" aria-label={tr("記録のまとめ")}>
          <Link href="/stamps" className="hub-item">
            <strong>{tr("産地スタンプ帳")}</strong>
            <span className="muted">
              {tr("{0} / {1}か所", stampInfo.stamps.size, stampInfo.total)}
            </span>
          </Link>
          <Link href="/shops" className="hub-item">
            <strong>{tr("お店")}</strong>
            <span className="muted">{tr("{0}軒", shopCount)}</span>
          </Link>
          <Link href="/wishlist" className="hub-item">
            <strong>{tr("気になるお酒")}</strong>
            <span className="muted">{tr("{0}件", wishCount)}</span>
          </Link>
          <Link href="/bottles" className="hub-item">
            <strong>{tr("家のお酒")}</strong>
            <span className="muted">{tr("{0}本", bottleCount)}</span>
          </Link>
          <Link href="/prefs" className="hub-item">
            <strong>{tr("わたしの好み")}</strong>
            <span className="muted">{tr("自分で登録")}</span>
          </Link>
        </nav>
        {ideas.length > 0 && (
          <section className="tips">
            <h2>{tr("次の一杯に")}</h2>
            <ul className="next-list">
              {ideas.map((i) => (
                <li key={i.title}>
                  <strong>{trv(i.title)}</strong>
                  <span>{trv(i.reason)}</span>
                  {i.description && <span className="muted">{trv(i.description)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {records && records.length > 0 && <TasteMap records={records} />}
        {records && <PriceCard records={records} budget={loadPrefs().budget} />}
        {records && !summary && (
          <EmptyState
            title={count === 0 ? tr("好みはこれから見えてくるよ") : tr("あと{0}杯で好みがわかるよ", MIN_RECORDS - count)}
            actions={[{ href: "/new", label: count === 0 ? tr("1杯目を記録する") : tr("記録する") }]}
          >
            {tr("記録が{0}件たまると、あなたの好みの傾向を出すよ（いま {1}件）。", MIN_RECORDS, count)}
          </EmptyState>
        )}
        {summary && (
          <>
            <section className="highlight">
              <span style={{ fontSize: 12, opacity: 0.85 }}>{tr("いまの傾向")}</span>
              {summary.bestCombo ? (
                <p className="highlight-main">{tr("{0} の評価が高めです", summary.bestCombo.label)}</p>
              ) : (
                <p className="highlight-main">{tr("同じタイプと飲み方の組み合わせが2件以上たまると、ここに出ます")}</p>
              )}
            </section>
            <Bars title={tr("種類ごと")} rows={summary.byKind} />
            <Bars title={tr("タイプごと")} rows={summary.byStyle} />
            <Bars title={tr("飲み方ごと")} rows={summary.byServe} />
            <Bars title={tr("産地ごと（2杯以上）")} rows={summary.byOrigin} />
            {summary.topFlavors.length > 0 && (
              <section className="card">
                <h2 style={{ fontSize: 14 }}>{tr("よく感じる味")}</h2>
                <div className="tags">
                  {summary.topFlavors.map((f) => (
                    <span key={f.label} className="tag" style={{ fontSize: 13 }}>
                      {trv(f.label)} ×{trv(f.count)}
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
