"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/BackLink";
import { drinkTitle, yen } from "@/components/RecordCard";
import { askConfirm } from "@/components/ConfirmSheet";
import { listRecords, peekRecords } from "@/lib/db";
import { DAY_AMOUNT } from "@/lib/dayTotal";
import { today } from "@/lib/lastScan";
import { loadShopToday } from "@/lib/shopToday";
import { addTally, removeLastTally, todayTallies, type Tally } from "@/lib/tally";
import { APP, WORDS } from "@/lib/appeal";
import { tr, trv } from "@/lib/i18n";
import type { TastingRecord } from "@/lib/types";

type Stop = { shop: string; from: number; records: TastingRecord[]; tallies: Tally[] };

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 今夜のカウンター：1軒目・2軒目…ごとに何杯・いくら・どれだけ飲んだか。記録しない1杯も＋1で数えられる */
export default function TonightPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(peekRecords);
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [shopNow, setShopNow] = useState("");
  useEffect(() => {
    listRecords().then(setRecords);
    setTallies(todayTallies());
    setShopNow(loadShopToday());
  }, []);

  const mine = useMemo(() => (records ?? []).filter((r) => r.date === today()), [records]);

  // お店ごとにまとめ、その日に最初に飲んだ順に 1軒目・2軒目…
  const stops = useMemo(() => {
    const map = new Map<string, Stop>();
    const at = (shop: string, t: number) => {
      const s = map.get(shop) ?? { shop, from: t, records: [], tallies: [] };
      s.from = Math.min(s.from, t);
      map.set(shop, s);
      return s;
    };
    for (const r of mine) at(r.shop.trim(), r.createdAt).records.push(r);
    for (const t of tallies) at(t.shop, t.at).tallies.push(t);
    return [...map.values()].sort((a, b) => a.from - b.from);
  }, [mine, tallies]);

  // いまいるお店：調べる画面で入れた名前 ＞ 最後に飲んだお店
  const current = shopNow || stops.at(-1)?.shop || "";
  const shown = stops.some((s) => s.shop === current)
    ? stops
    : [...stops, { shop: current, from: Date.now(), records: [], tallies: [] }];

  const amountOf = (s: Pick<Stop, "records" | "tallies">) =>
    s.records.reduce((n, r) => n + DAY_AMOUNT.of(r), 0) + s.tallies.reduce((n, t) => n + DAY_AMOUNT.of(t.like ?? {}), 0);
  const cups = (s: Pick<Stop, "records" | "tallies">) => s.records.length + s.tallies.length;
  const priceOf = (s: Pick<Stop, "records">) => s.records.reduce((n, r) => n + (r.price ?? 0), 0);

  const all = { records: mine, tallies };
  const total = DAY_AMOUNT.round(amountOf(all));
  const spent = priceOf(all);
  // 目安を真ん中に置いたメーター。2倍で満タン
  const fill = Math.min(100, (total / (DAY_AMOUNT.guide * 2)) * 100);
  const over = total > DAY_AMOUNT.guide;

  const plusOne = () => {
    // 量の計算は、そのお店（なければ今日）で最後に記録した1杯と同じとみなす
    const last = [...mine].reverse().find((r) => r.shop.trim() === current) ?? mine.at(-1);
    setTallies(addTally(current, last ? DAY_AMOUNT.like(last) : undefined));
  };
  const minusOne = async () => {
    const ok = await askConfirm({
      message: tr("記録なしで数えた1{0}をへらします", WORDS.cup),
      action: tr("1{0}へらす", WORDS.cup),
    });
    if (ok) setTallies(removeLastTally(current));
  };

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{APP.id === "sake-memo" ? tr("今夜のカウンター") : tr("今日のカウンター")}</h1>
      </header>
      <main className="content">
        <section className="card tally-hero">
          <p className="tally-big">
            <strong>{cups(all)}</strong>
            {tr(WORDS.cup)}
          </p>
          <p className="tally-sub">
            {[spent > 0 ? yen(spent) : "", DAY_AMOUNT.text(total)].filter(Boolean).join(tr("・"))}
          </p>
          <div className="tally-gauge" data-over={over || undefined} aria-hidden="true">
            <span style={{ width: `${fill}%` }} />
            <i />
          </div>
          <p className="tally-guide muted">{tr(DAY_AMOUNT.guideText)}</p>
        </section>

        {shown.map((s, i) => {
          const now = s.shop === current;
          const amount = DAY_AMOUNT.round(amountOf(s));
          const price = priceOf(s);
          return (
            <section key={s.shop || "-"} className="card tally-stop" data-now={now || undefined}>
              <div className="tally-stop-head">
                <span className="tally-nth">{tr("{0}軒目", i + 1)}</span>
                <h2>{s.shop ? trv(s.shop) : tr("お店（名前なし）")}</h2>
                {cups(s) > 0 && <span className="tally-time">{tr("{0}〜", hhmm(s.from))}</span>}
              </div>
              <p className="tally-count">
                <strong>{cups(s)}</strong>
                {tr(WORDS.cup)}
                <span className="muted">
                  {[price > 0 ? yen(price) : "", cups(s) > 0 ? DAY_AMOUNT.text(amount) : ""].filter(Boolean).join(tr("・"))}
                </span>
              </p>
              {cups(s) > 0 && (
                <ul className="tally-drinks">
                  {s.records.map((r) => (
                    <li key={r.id}>
                      <Link href={`/record?id=${r.id}`}>{drinkTitle(r)}</Link>
                    </li>
                  ))}
                  {s.tallies.length > 0 && <li className="muted">{tr("記録なし ×{0}", s.tallies.length)}</li>}
                </ul>
              )}
              {now && (
                <div className="tally-btns">
                  <button type="button" className="tally-minus" aria-label={tr("1{0}へらす", WORDS.cup)} disabled={!s.tallies.length} onClick={minusOne}>
                    −
                  </button>
                  <button type="button" className="btn-primary tally-plus" onClick={plusOne}>
                    {tr("＋1{0}（記録なしで数える）", WORDS.cup)}
                  </button>
                </div>
              )}
            </section>
          );
        })}

        <Link href="/new" className="btn-secondary">
          {tr("記録する")}
        </Link>
      </main>
    </>
  );
}
