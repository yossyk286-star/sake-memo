"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import RadarChart, { SERIES_COLORS } from "@/components/RadarChart";
import { drinkTitle, stars, yen } from "@/components/RecordCard";
import { abvText } from "@/lib/abv";
import { TASTE_AXES } from "@/lib/axes";
import { listRecords } from "@/lib/db";
import { compareImage, shareImage } from "@/lib/shareImage";
import type { TastingRecord } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";

/** 表で並べる項目 */
const ROWS: [string, (r: TastingRecord) => string][] = [
  ["種類", (r) => trJoin([r.kind, r.style])],
  ["飲み方", (r) => tr(r.serve ?? "")],
  ["産地", (r) => tr(r.origin)],
  ["蔵元", (r) => r.maker],
  ["店・日付", (r) => `${r.shop} ${r.date.slice(5).replace("-", "/")}`],
  ["感じた味", (r) => trJoin(r.flavors)],
  ["度数", (r) => (r.abv ? abvText(r.abv) : "")],
  ["値段", (r) => (r.price ? yen(r.price) : "")],
  ["合わせた料理", (r) => tr(r.pairing)],
];

function Picker({
  records,
  exclude,
  onPick,
}: {
  records: TastingRecord[];
  exclude: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = records.filter(
    (r) =>
      r.id !== exclude &&
      (!q || [r.name, r.maker, r.shop, r.kind ?? "", r.style ?? ""].some((s) => s.toLowerCase().includes(q))),
  );
  return (
    <>
      <label htmlFor="cmp-search" className="visually-hidden">
        {tr("記録を検索")}
      </label>
      <input
        id="cmp-search"
        type="search"
        className="input"
        placeholder={tr("名前・店・種類で探す")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {list.map((r) => (
        <button key={r.id} type="button" className="card pick-row" onClick={() => onPick(r.id)}>
          <div className="card-top">
            <strong>{drinkTitle(r)}</strong>
            <span className="stars" style={{ fontSize: 12 }}>
              {stars(r.overall)}
            </span>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {[r.kind, r.style, r.shop, r.date].filter(Boolean).join("・")}
          </span>
        </button>
      ))}
      {list.length === 0 && <p className="empty">{tr("比べられる記録がありません。")}</p>}
    </>
  );
}

function CompareBody() {
  const router = useRouter();
  const params = useSearchParams();
  const aId = params.get("a") ?? "";
  const bId = params.get("b") ?? "";
  const [records, setRecords] = useState<TastingRecord[] | null>(null);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const a = useMemo(() => records?.find((r) => r.id === aId), [records, aId]);
  const b = useMemo(() => records?.find((r) => r.id === bId), [records, bId]);
  const pair = a && b ? [a, b] : null;

  return (
    <>
      <header className="sub-header">
        <Link href={aId ? `/record?id=${aId}` : "/"} className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("くらべる")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        {records && !a && (
          <p className="empty">
            {tr("くらべる記録が選ばれていません。")}
            <br />
            {tr("記録を開いて「ほかの記録とくらべる」から選べます。")}
          </p>
        )}
        {a && !b && (
          <>
            <p style={{ margin: 0, fontSize: 14 }}>{tr("「{0}」と比べる記録を選んでください。", drinkTitle(a))}</p>
            <Picker
              records={records ?? []}
              exclude={a.id}
              onPick={(id) => router.replace(`/compare?a=${a.id}&b=${id}`)}
            />
          </>
        )}
        {pair && (
          <>
            <div className="compare-legend">
              {pair.map((r, i) => (
                <Link key={r.id} href={`/record?id=${r.id}`} className="compare-name">
                  <i style={{ background: SERIES_COLORS[i] }} aria-hidden="true" />
                  <strong>{drinkTitle(r)}</strong>
                </Link>
              ))}
            </div>
            <section className="card">
              <div className="compare-overall" aria-label={tr("総合評価")}>
                {pair.map((r, i) => (
                  <div key={r.id}>
                    <span className="muted">{tr("総合評価")}</span>
                    <strong style={{ color: SERIES_COLORS[i] }}>{r.overall.toFixed(1)}</strong>
                    <span className="stars" style={{ color: SERIES_COLORS[i] }}>
                      {stars(r.overall)}
                    </span>
                  </div>
                ))}
              </div>
              <RadarChart
                axes={TASTE_AXES.map(([label]) => label)}
                series={pair.map((r) => ({ label: drinkTitle(r), values: TASTE_AXES.map(([, get]) => get(r) ?? null) }))}
              />
              {pair.some((r) => TASTE_AXES.some(([, get]) => !get(r))) && (
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  {tr("入れていない項目は中心にしています。記録を編集すると足せます。")}
                </p>
              )}
            </section>
            <section className="card">
              <table className="compare-table">
                <tbody>
                  {ROWS.map(([label, get]) => {
                    const [x, y] = pair.map(get);
                    if (!x && !y) return null;
                    return (
                      <tr key={label}>
                        <th>{trv(label)}</th>
                        <td>{x || "—"}</td>
                        <td>{y || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                const blob = await compareImage(
                  TASTE_AXES.map(([label]) => label),
                  pair.map((r) => ({
                    label: drinkTitle(r),
                    sub: [r.kind, r.style, r.origin].filter(Boolean).join("・"),
                    overall: r.overall,
                    values: TASTE_AXES.map(([, get]) => get(r)),
                  })),
                );
                await shareImage(blob, tr("くらべる")).catch(() => alert(tr("共有できませんでした")));
              }}
            >
              {tr("画像にして送る")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.replace(`/compare?a=${aId}`)}>
              {tr("比べる相手を変える")}
            </button>
          </>
        )}
      </main>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareBody />
    </Suspense>
  );
}
