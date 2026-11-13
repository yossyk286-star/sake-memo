"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/BackLink";
import { drinkTitle, yen } from "@/components/RecordCard";
import { askConfirm } from "@/components/ConfirmSheet";
import { listRecords, peekRecords } from "@/lib/db";
import { DAY_AMOUNT, guessLike, QUICK_DRINKS } from "@/lib/dayTotal";
import { today } from "@/lib/lastScan";
import { loadShopToday } from "@/lib/shopToday";
import { addCustomDrink, addTally, loadCustomDrinks, loadPrices, removeLastTally, savePrice, todayTallies, usageOf, type Tally } from "@/lib/tally";
import { APP, WORDS } from "@/lib/appeal";
import { tr, trv } from "@/lib/i18n";
import type { TastingRecord } from "@/lib/types";

type Stop = { shop: string; from: number; records: TastingRecord[]; tallies: Tally[] };
/** お店の中で、同じ飲み物をまとめた1行（記録＋おかわり、または「生ビール ×3」） */
type Item = { name: string; records: TastingRecord[]; tallies: Tally[] };

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 今夜のカウンター：1軒目・2軒目…ごとに何杯・いくら・どれだけ飲んだか。銘柄のない生ビールなども押すだけで数える */
export default function TonightPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(peekRecords);
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [shopNow, setShopNow] = useState("");
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({});
  const [custom, setCustom] = useState<{ name: string; like: Partial<TastingRecord> }[]>([]);
  const [usage, setUsage] = useState<Map<string, number>>(new Map());
  const [opened, setOpened] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  useEffect(() => {
    listRecords().then(setRecords);
    setTallies(todayTallies());
    setShopNow(loadShopToday());
    setPrices(loadPrices());
    setCustom(loadCustomDrinks());
    setUsage(usageOf());
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
  const shown = stops.some((s) => s.shop === current) ? stops : [...stops, { shop: current, from: Date.now(), records: [], tallies: [] }];

  const itemsOf = (s: Stop): Item[] => {
    const map = new Map<string, Item>();
    const get = (name: string) => map.get(name) ?? map.set(name, { name, records: [], tallies: [] }).get(name)!;
    for (const r of s.records) get(drinkTitle(r)).records.push(r);
    for (const t of s.tallies) get(t.name ?? "").tallies.push(t);
    return [...map.values()];
  };
  // 1杯の値段：記録した値段 ＞ このお店で覚えた値段
  const unitPrice = (shop: string, it: Item) => it.records.find((r) => r.price != null)?.price ?? prices[shop]?.[it.name] ?? 0;
  const priceOf = (shop: string, it: Item) => it.records.reduce((n, r) => n + (r.price ?? 0), 0) + it.tallies.length * unitPrice(shop, it);
  const amountOfItem = (it: Item) => it.records.reduce((n, r) => n + DAY_AMOUNT.of(r), 0) + it.tallies.reduce((n, t) => n + DAY_AMOUNT.of(t.like ?? {}), 0);
  const sum = (s: Stop, f: (it: Item) => number) => itemsOf(s).reduce((n, it) => n + f(it), 0);
  const cups = (s: Stop) => s.records.length + s.tallies.length;

  const totalCups = stops.reduce((n, s) => n + cups(s), 0);
  const total = DAY_AMOUNT.round(stops.reduce((n, s) => n + sum(s, amountOfItem), 0));
  const spent = stops.reduce((n, s) => n + sum(s, (it) => priceOf(s.shop, it)), 0);
  // 目安を真ん中に置いたメーター。2倍で満タン
  const fill = Math.min(100, (total / (DAY_AMOUNT.guide * 2)) * 100);
  const over = total > DAY_AMOUNT.guide;

  // よく飲むもの：決まったもの＋自分で足したもの、よく押した順
  const quick = useMemo(() => {
    const all = [...QUICK_DRINKS, ...custom.filter((c) => !QUICK_DRINKS.some((q) => q.name === c.name))];
    return all.map((d, i) => ({ ...d, i })).sort((a, b) => (usage.get(b.name) ?? 0) - (usage.get(a.name) ?? 0) || a.i - b.i);
  }, [custom, usage]);

  const plus = (it: Item) => {
    const rec = it.records[0];
    const like = rec ? DAY_AMOUNT.like(rec) : (it.tallies[0]?.like ?? quick.find((q) => q.name === it.name)?.like);
    setTallies(addTally(current, { name: it.name || undefined, recId: rec?.id, like }));
  };
  const plusQuick = (name: string, like: Partial<TastingRecord>) => {
    setTallies(addTally(current, { name, like }));
    setUsage(usageOf());
  };
  const minus = async (it: Item) => {
    const ok = await askConfirm({
      message: tr("「{0}」を1{1}へらします", it.name ? trv(it.name) : tr("名前なし"), WORDS.cup),
      action: tr("1{0}へらす", WORDS.cup),
    });
    if (ok) setTallies(removeLastTally(current, it.name || undefined));
  };
  const addNew = () => {
    const name = newName.trim();
    if (!name) return;
    const like = guessLike(name);
    addCustomDrink(name, like);
    setCustom(loadCustomDrinks());
    plusQuick(name, like);
    setNewName("");
    setAdding(false);
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
            <strong>{totalCups}</strong>
            {tr(WORDS.cup)}
          </p>
          <p className="tally-sub">{[spent > 0 ? yen(spent) : "", DAY_AMOUNT.text(total)].filter(Boolean).join(tr("・"))}</p>
          <div className="tally-gauge" data-over={over || undefined} aria-hidden="true">
            <span style={{ width: `${fill}%` }} />
            <i />
          </div>
          <p className="tally-guide muted">{tr(DAY_AMOUNT.guideText)}</p>
        </section>

        {shown.map((s, i) => {
          const now = s.shop === current;
          const items = itemsOf(s);
          const price = sum(s, (it) => priceOf(s.shop, it));
          const amount = DAY_AMOUNT.round(sum(s, amountOfItem));
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
                <span className="muted">{[price > 0 ? yen(price) : "", cups(s) > 0 ? DAY_AMOUNT.text(amount) : ""].filter(Boolean).join(tr("・"))}</span>
              </p>
              {items.length > 0 && (
                <ul className="tally-items">
                  {items.map((it) => {
                    const key = `${s.shop}\n${it.name}`;
                    const n = it.records.length + it.tallies.length;
                    const p = priceOf(s.shop, it);
                    const open = opened === key;
                    return (
                      <li key={it.name || "-"}>
                        <div className="tally-item">
                          <button type="button" className="tally-item-name" aria-expanded={open} onClick={() => setOpened(open ? null : key)}>
                            <span>{it.name ? trv(it.name) : tr("名前なし")}</span>
                            {n > 1 && <span className="tally-x">×{n}</span>}
                          </button>
                          {p > 0 && <span className="tally-item-price">{yen(p)}</span>}
                          {now && (
                            <span className="tally-step">
                              <button type="button" aria-label={tr("1{0}へらす", WORDS.cup)} disabled={!it.tallies.length} onClick={() => minus(it)}>
                                −
                              </button>
                              <button type="button" aria-label={it.records.length ? tr("おかわり") : tr("1{0}ふやす", WORDS.cup)} onClick={() => plus(it)}>
                                ＋
                              </button>
                            </span>
                          )}
                        </div>
                        {open && (
                          <div className="tally-more">
                            {!it.records.some((r) => r.price != null) && it.name && (
                              <label className="tally-price">
                                {tr("1{0}", WORDS.cup)}
                                <input
                                  className="input"
                                  inputMode="numeric"
                                  placeholder={tr("例：600")}
                                  defaultValue={prices[s.shop]?.[it.name] ?? ""}
                                  onChange={(e) => {
                                    const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
                                    savePrice(s.shop, it.name, digits ? Number(digits) : null);
                                    setPrices(loadPrices());
                                  }}
                                />
                                {tr("円（このお店で覚えます）")}
                              </label>
                            )}
                            {it.records.length > 0 ? (
                              <Link href={`/record?id=${it.records[0].id}`} className="text-btn">
                                {tr("記録を見る")}
                              </Link>
                            ) : (
                              it.tallies.length > 0 && (
                                <Link href={`/new?name=${encodeURIComponent(it.name)}&tally=${it.tallies.at(-1)!.id}`} className="text-btn">
                                  {tr("★や感想を書いて記録にする")}
                                </Link>
                              )
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {now && (
                <div className="tally-quick">
                  <p className="tally-quick-label">{tr("押すと1{0}ふえます", WORDS.cup)}</p>
                  <div className="chip-wrap">
                    {quick.map((q) => (
                      <button key={q.name} type="button" className="chip" onClick={() => plusQuick(q.name, q.like)}>
                        ＋ {trv(q.name)}
                      </button>
                    ))}
                    <button type="button" className="chip tally-add" aria-expanded={adding} onClick={() => setAdding(!adding)}>
                      {tr("＋ ほかの飲み物")}
                    </button>
                  </div>
                  {adding && (
                    <form
                      className="row tally-new"
                      onSubmit={(e) => {
                        e.preventDefault();
                        addNew();
                      }}
                    >
                      <input
                        className="input"
                        autoFocus
                        placeholder={APP.id === "sake-memo" ? tr("例：梅酒ロック") : tr("例：ほうじ茶ラテ")}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <button type="submit" className="btn-secondary" disabled={!newName.trim()}>
                        {tr("足す")}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>
          );
        })}

        <Link href="/new" className="btn-secondary">
          {APP.id === "sake-memo" ? tr("銘柄を記録する") : tr("豆を記録する")}
        </Link>
      </main>
    </>
  );
}
