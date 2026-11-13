"use client";

import BackLink from "@/components/BackLink";
import { SingleChips } from "@/components/ChipGroup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listRecords, putRecord } from "@/lib/db";
import { KINDS } from "@/lib/glossary";
import { tr, trv } from "@/lib/i18n";
import { DATE_CHIPS } from "@/lib/quickPick";
import { loadShopToday } from "@/lib/shopToday";
import { today } from "@/lib/lastScan";
import { toast } from "@/lib/toast";
import type { Kind, Overall, Score, TastingRecord } from "@/lib/types";

type Row = { name: string; overall: Overall | null; rank: number | null };
const NUM = ["①", "②", "③", "④", "⑤"];
const empty = (): Row => ({ name: "", overall: null, rank: null });

/** 甘い順の番号を、1（辛口）〜5（甘口）の甘さにする */
function sweetOf(rank: number, n: number): Score {
  return (n <= 1 ? 3 : Math.round(5 - ((rank - 1) * 4) / (n - 1))) as Score;
}

/** お店の「飲み比べ3種」を並べたまま記録する（18）。保存すると1杯ずつの記録になり、くらべる画面へ */
export default function FlightPage() {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [shop, setShop] = useState("");
  const [kind, setKind] = useState<Kind | null>("日本酒");
  const [rows, setRows] = useState<Row[]>([empty(), empty(), empty()]);
  const [ranking, setRanking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pastNames, setPastNames] = useState<string[]>([]);
  useEffect(() => {
    setShop(loadShopToday());
    listRecords().then((rs) => setPastNames([...new Set(rs.map((r) => r.name.trim()).filter(Boolean))]));
  }, []);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.name.trim());
  const nextRank = Math.max(0, ...rows.map((r) => r.rank ?? 0)) + 1;

  async function save() {
    if (!shop.trim()) return setError("お店の名前を入れるか「家で」を選んでください");
    if (filled.length < 2) return setError("2つ以上の名前を入れてください");
    if (filled.some((r) => !r.overall)) return setError("それぞれの★を選んでください");
    setError("");
    setSaving(true);
    const now = Date.now();
    const ranked = filled.filter((r) => r.rank).length;
    const out: TastingRecord[] = filled.map((r, i) => ({
      id: crypto.randomUUID(),
      date,
      shop: shop.trim(),
      name: r.name.trim(),
      maker: "",
      origin: "",
      kind,
      style: null,
      serve: null,
      menuNote: "",
      flavors: [],
      sweetness: r.rank && ranked === filled.length ? sweetOf(r.rank, filled.length) : null,
      acidity: null,
      body: null,
      overall: r.overall!,
      pairing: "",
      memo: tr("飲み比べ {0}/{1}", NUM[i], NUM[filled.length - 1]),
      photos: [],
      createdAt: now + i,
      updatedAt: now + i,
    }));
    for (const r of out) await putRecord(r);
    toast(tr("{0}杯を記録しました", out.length));
    router.replace(
      `/compare?ids=${out
        .slice(0, 4)
        .map((r) => r.id)
        .join(",")}`,
    );
  }

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/new" />
        <h1>{tr("飲み比べセット")}</h1>
      </header>
      <main className="content form" style={{ paddingTop: 16 }}>
        <div className="field">
          <span className="label">{tr("日付")}</span>
          <div className="chip-wrap date-chips">
            {DATE_CHIPS.map(([label, get]) => (
              <button key={label} type="button" className="chip" aria-pressed={date === get()} onClick={() => setDate(get())}>
                {tr(label)}
              </button>
            ))}
            <input className="input flight-date" type="date" aria-label={tr("日付")} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="fl-shop">
            {tr("どこで飲んだ")}
          </label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input id="fl-shop" className="input" placeholder={tr("店名（例：〇〇酒場）")} value={shop} onChange={(e) => setShop(e.target.value)} />
            <button
              type="button"
              className="chip"
              style={{ flexShrink: 0 }}
              aria-pressed={shop.trim() === "家"}
              onClick={() => setShop(shop.trim() === "家" ? "" : "家")}
            >
              {tr("家で")}
            </button>
          </div>
        </div>
        <fieldset className="field">
          <legend className="label">{tr("種類")}</legend>
          <SingleChips options={KINDS} value={kind} onChange={setKind} />
        </fieldset>

        <datalist id="flight-names">
          {pastNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {rows.map((r, i) => (
          <section key={i} className="card flight-row">
            <div className="flight-head">
              <span className="flight-num">{NUM[i]}</span>
              <input
                className="input"
                list="flight-names"
                aria-label={tr("{0}の名前", NUM[i])}
                placeholder={tr("名前（例：田酒）")}
                value={r.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
              {ranking && r.name.trim() && (
                <button type="button" className="chip flight-rank" aria-pressed={!!r.rank} onClick={() => setRow(i, { rank: r.rank ? null : nextRank })}>
                  {r.rank ? tr("{0}番目", r.rank) : tr("押す")}
                </button>
              )}
            </div>
            <div className="flight-stars" role="radiogroup" aria-label={tr("{0}の★", NUM[i])}>
              {([1, 2, 3, 4, 5] as Overall[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={r.overall === n}
                  className={r.overall && r.overall >= n ? "on" : ""}
                  onClick={() => setRow(i, { overall: n })}
                >
                  ★
                </button>
              ))}
              <span className="muted">{r.overall ? r.overall.toFixed(1) : ""}</span>
            </div>
          </section>
        ))}
        <div className="row">
          {rows.length < 5 && (
            <button type="button" className="btn-ghost" onClick={() => setRows([...rows, empty()])}>
              {tr("＋ もう1つ")}
            </button>
          )}
          {rows.length > 2 && (
            <button type="button" className="btn-ghost" onClick={() => setRows(rows.slice(0, -1))}>
              {tr("− 1つ減らす")}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            aria-pressed={ranking}
            onClick={() => {
              setRanking(!ranking);
              setRows((rs) => rs.map((r) => ({ ...r, rank: null })));
            }}
          >
            {ranking ? tr("甘い順をやめる") : tr("甘い順に並べる")}
          </button>
        </div>
        {ranking && <p className="muted field-note">{tr("いちばん甘いものから順に「押す」をタップ。甘さの欄に入ります。")}</p>}
        {error && (
          <p className="error" role="alert">
            {trv(error)}
          </p>
        )}
        <div className="save-bar">
          <button type="button" className="btn-primary save-btn" disabled={saving} onClick={save}>
            {saving ? tr("保存中…") : tr("{0}杯をまとめて保存", Math.max(filled.length, 2))}
          </button>
        </div>
      </main>
    </>
  );
}
