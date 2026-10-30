"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import Skeleton from "@/components/Skeleton";
import { announceBuddy } from "@/lib/buddy";
import { listBottles, listRecords } from "@/lib/db";
import {
  BUILT_IN_DISHES,
  builtInPairing,
  findSavedPairing,
  groupMenu,
  loadLastPair,
  matchBottles,
  matchRecords,
  recentPairings,
  saveLastPair,
  savePairing,
  type FoodMenu,
  type FoodPairing,
  type MineMatch,
} from "@/lib/foodPairing";
import { genreColor, genreOf } from "@/lib/genre";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import { shrinkPhoto } from "@/lib/photo";
import { loadPrefs } from "@/lib/prefs";
import type { Bottle, TastingRecord } from "@/lib/types";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** AI に渡す、自分で登録した好み（好きな種類・タイプ・苦手な種類） */
function likesText() {
  const p = loadPrefs();
  return [
    p.kinds.length > 0 && `好きな種類：${p.kinds.join("、")}`,
    p.styles.length > 0 && `好きなタイプ：${p.styles.join("、")}`,
    p.avoidKinds.length > 0 && `苦手な種類：${p.avoidKinds.join("、")}`,
  ]
    .filter(Boolean)
    .join("。");
}

type Result = {
  query: string;
  pairing: FoodPairing;
  /** どこから出したか */
  from: "built-in" | "saved" | "ai";
  records: MineMatch<TastingRecord>[];
  bottles: MineMatch<Bottle>[];
};

/** 料理や食べ物を入れると、合うお酒と、自分の記録・家のお酒から合いそうなものを出す */
export default function PairPage() {
  const [dish, setDish] = useState("");
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(true);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // メニューの写真から読み取った料理と、それぞれにいちばん合うもの
  const [menu, setMenu] = useState<FoodMenu["dishes"] | null>(null);
  const [reading, setReading] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSavedPasscode(!!p);
    setRecent(recentPairings(6));
    const last = loadLastPair();
    if (last?.menu) setMenu(last.menu);
    Promise.all([listRecords(), listBottles()]).then(([r, b]) => {
      setRecords(r);
      setBottles(b);
      // 前に見ていた料理の候補も戻す（内蔵表か保存済みの結果なので通信しない）
      const q = last?.query ?? "";
      const builtIn = q ? builtInPairing(q) : null;
      const pairing = builtIn ?? (q ? findSavedPairing(q) : null);
      if (pairing) {
        setDish(q);
        setResult({ query: q, pairing, from: builtIn ? "built-in" : "saved", records: matchRecords(r, pairing, q), bottles: matchBottles(b, pairing) });
      }
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    if (restored) saveLastPair({ menu, query: result?.query ?? "" });
  }, [restored, menu, result?.query]);

  function show(query: string, pairing: FoodPairing, from: Result["from"]) {
    const mine = matchRecords(records, pairing, query);
    const home = matchBottles(bottles, pairing);
    setResult({ query, pairing, from, records: mine, bottles: home });
    if (home[0]) {
      announceBuddy({ text: `家にある「${home[0].item.name}」、${pairing.dish}に合いそう！`, mood: "happy" });
    }
  }

  async function post(payload: object) {
    const code = normalizePasscode(passcode);
    const res = await fetch("/api/read-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, likes: likesText(), passcode: code }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setSavedPasscode(false);
    if (!res.ok) throw new Error(data.error ?? "調べられませんでした");
    savePasscode(code);
    setSavedPasscode(true);
    return data;
  }

  /** メニューや料理の写真を送って、載っている料理ごとに合うものを出す */
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || reading) return;
    if (!passcode.trim()) return setError("先に合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため読み取れません。電波のあるところでもう一度お試しください");
    setError("");
    setReading(true);
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(file, 1000));
      const data = (await post({ foodImage: image })) as FoodMenu;
      setMenu(data.dishes);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取れませんでした");
    } finally {
      setReading(false);
    }
  }

  async function choose(input = dish) {
    const q = input.trim();
    if (!q || busy) return;
    setDish(q);
    setError("");
    const local = builtInPairing(q);
    if (local) return show(q, local, "built-in");
    const saved = findSavedPairing(q);
    if (saved) return show(q, saved, "saved");
    if (!navigator.onLine) {
      setError("オフラインのため調べられません。電波のあるところでもう一度お試しください");
      return;
    }
    setBusy(true);
    try {
      const data = await post({ food: q });
      const pairing: FoodPairing = { dish: data.dish || q, tip: data.tip, picks: data.picks };
      savePairing(q, pairing);
      setRecent(recentPairings(6));
      show(q, pairing, "ai");
    } catch (e) {
      setError(e instanceof Error ? e.message : "調べられませんでした");
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [...new Set([...recent, ...BUILT_IN_DISHES])].slice(0, 14);

  return (
    <>
      <header className="sub-header">
        <Link href="/scan" className="back">
          ‹ 調べる
        </Link>
        <h1>料理から選ぶ</h1>
      </header>
      <p className="lead" style={{ paddingTop: 12 }}>
        食べる料理を入れるかメニューを撮ると、合うお酒と、これまでの記録や家のお酒から合いそうなものを出します。
      </p>

      <main className="content" style={{ paddingBottom: 110 }}>
        {!savedPasscode && (
          <div className="field">
            <label className="label" htmlFor="pair-pass">
              合言葉（よくある料理なら、なくても使えます）
            </label>
            <input
              id="pair-pass"
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
        )}
        <form
          className="row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            choose();
          }}
        >
          <label htmlFor="pair-dish" className="visually-hidden">
            料理・食べ物
          </label>
          <input
            id="pair-dish"
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            type="search"
            enterKeyHint="search"
            maxLength={40}
            placeholder="料理・食べ物（例：焼き鳥）"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0, width: "auto", height: 46, padding: "0 20px", fontSize: 16 }} disabled={!dish.trim() || busy}>
            {busy ? "選び中…" : "選ぶ"}
          </button>
        </form>
        <div className="scroll-row" aria-label="よく食べる料理">
          {suggestions.map((d) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={result?.pairing.dish === d}
              onClick={() => choose(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="pair-shoot">
          <label className="btn-secondary" aria-disabled={reading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
            </svg>
            {reading ? "読み取り中…" : "メニューを撮る"}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} disabled={reading} className="visually-hidden" />
          </label>
          <label className="btn-secondary" aria-disabled={reading}>
            写真から
            {/* capture を付けないとカメラではなく写真の一覧が開く */}
            <input type="file" accept="image/*" onChange={onPhoto} disabled={reading} className="visually-hidden" />
          </label>
        </div>
        {reading && <Skeleton label="メニューを読み取っています…" chips />}
        {menu && !reading && (
          <section className="pair-mine" aria-live="polite">
            <div className="pair-menu-head">
              <h2 className="pair-head">メニューの料理に合うお酒</h2>
              <button type="button" className="text-btn" onClick={() => setMenu(null)}>
                閉じる
              </button>
            </div>
            {groupMenu(menu).map((g, gi) => (
              <div key={g.key} className={gi === 0 ? "card pair-group pair-best" : "card pair-group"} style={{ "--kind": genreColor(genreOf({ kind: g.pick.kind, style: g.pick.style, name: "" })) } as React.CSSProperties}>
                {gi === 0 && <span className="pair-best-label">このメニューならまずこれ</span>}
                {gi === 1 && <span className="pair-best-label pair-other-label">ほかに合わせるなら</span>}
                <div className="pair-group-head">
                  <span className="kind-dot" style={{ background: "var(--kind)" }} aria-hidden="true" />
                  <h3>{g.label}</h3>
                  {g.sub && <span className="muted">{g.sub}</span>}
                </div>
                {gi === 0 && <p className="pair-group-reason">{g.items[0].reason}</p>}
                <div className="pair-dishes" aria-label="合う料理">
                  {g.items.map((it) => (
                    <button
                      key={it.dish}
                      type="button"
                      className="chip"
                      aria-pressed={result?.query === it.dish}
                      onClick={() => choose(it.dish)}
                    >
                      {it.dish}
                    </button>
                  ))}
                </div>
                <details className="pair-why">
                  <summary>料理ごとの説明</summary>
                  <dl>
                    {g.items.map((it) => (
                      <div key={it.dish}>
                        <dt>{it.dish}</dt>
                        <dd>{it.reason}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            ))}
            <p className="muted pair-none">料理を押すと、ほかの候補や、記録・家のお酒から合うものも出します。</p>
          </section>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {busy && <Skeleton label={`「${dish.trim()}」に合うお酒を選んでいます…`} cards={2} chips />}
        {result && !busy && (
          <>
            <section className="pair-result" aria-live="polite">
              <h2 className="pair-head">「{result.pairing.dish}」に合うお酒</h2>
              {result.pairing.tip && (
                <div className="pair-tip">
                  <BuddyFace mood="happy" size={52} />
                  <p>{result.pairing.tip}</p>
                </div>
              )}
              <ol className="pair-list">
                {result.pairing.picks.map((p, i) => {
                  const g = genreOf({ kind: p.kind, style: p.style, name: p.title });
                  return (
                    <li key={p.title} className="card pair-pick" style={{ "--kind": genreColor(g) } as React.CSSProperties}>
                      <span className="pair-rank" aria-label={`${i + 1}番目`}>
                        {i + 1}
                      </span>
                      <div className="pair-body">
                        <div className="tags">
                          <span className="tag kind-tag">{g ?? p.kind}</span>
                          {p.style && p.style !== g && <span className="tag tag-plain">{p.style}</span>}
                        </div>
                        <h3>{p.title}</h3>
                        <p>{p.reason}</p>
                        {p.examples && <p className="muted">例：{p.examples}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {result.bottles.length > 0 && (
              <section className="pair-mine">
                <h2 className="pair-head">家にあるお酒なら</h2>
                <div className="list-group">
                  {result.bottles.map(({ item: b, why }) => (
                    <Link key={b.id} href="/bottles" className="pair-row">
                      <span className="kind-dot" style={{ background: genreColor(genreOf(b)) }} aria-hidden="true" />
                      <span className="pair-row-body">
                        <strong>{b.name}</strong>
                        <span className="muted">
                          {why}
                          {b.low ? "・残りわずか" : ""}
                        </span>
                      </span>
                      <span className="pair-chevron" aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="pair-mine">
              <h2 className="pair-head">これまでの記録から</h2>
              {result.records.length > 0 ? (
                <div className="list-group">
                  {result.records.map(({ item: r, why }) => (
                    <Link key={r.id} href={`/record?id=${r.id}`} className="pair-row">
                      <span className="kind-dot" style={{ background: genreColor(genreOf(r)) }} aria-hidden="true" />
                      <span className="pair-row-body">
                        <strong>{r.name}</strong>
                        <span className="muted">{why}</span>
                      </span>
                      <span className="pair-chevron" aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted pair-none">
                  {records.length === 0
                    ? "記録がたまると、飲んだお酒の中からも合いそうなものを選びます。"
                    : "合いそうな記録はまだありません。記録の「合わせた料理」を書いておくと、次から出てきます。"}
                </p>
              )}
            </section>

            <p className="muted pair-from">
              {result.from === "ai"
                ? "AI が選びました。"
                : result.from === "saved"
                  ? "前に AI が選んだ結果から出しました（AI は使っていません）。"
                  : "よくある料理なので、内蔵の表から出しました（AI は使っていません）。"}
            </p>
          </>
        )}
      </main>
    </>
  );
}
