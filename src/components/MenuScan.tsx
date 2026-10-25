"use client";

import { useEffect, useMemo, useState } from "react";
import { type MenuScanResult, type PairingResult, type ScannedDrink } from "@/lib/menuScan";
import { placeOf } from "@/lib/origins";
import {
  deleteWish,
  listRecords,
  listWishes,
  putWish,
  type WishDrink,
} from "@/lib/db";
import { loadLastScan, saveLastScan } from "@/lib/lastScan";
import { shrinkPhoto } from "@/lib/photo";
import { EMPTY_PREFS, loadPrefs } from "@/lib/prefs";
import { bestPick, MIN_RECORDS, scoreDrinks } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";
import TasteBars, { level } from "./TasteBars";

const PASSCODE_KEY = "sake-memo:passcode";

/** 今日の気分。押すと、味の予想からその気分に合う順に並べ替える */
const MOODS: { label: string; score: (d: ScannedDrink) => number }[] = [
  {
    label: "すっきり",
    score: ({ taste: t }) =>
      level(t.acidity) - 0.7 * level(t.sweetness) - 0.6 * level(t.body),
  },
  {
    label: "甘め",
    score: ({ taste: t }) => level(t.sweetness) + 0.2 * level(t.aroma),
  },
  {
    label: "香り華やか",
    score: ({ taste: t }) => level(t.aroma) + 0.2 * level(t.sweetness),
  },
  {
    label: "しっかり",
    score: ({ taste: t }) => level(t.body) - 0.2 * level(t.acidity),
  },
];

function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 選んだお酒の解説とおすすめ（フォームの上に出しておく） */
export function PickedDrink({
  drink,
  onChange,
}: {
  drink: ScannedDrink;
  onChange?: () => void;
}) {
  return (
    <section className="tips" style={{ margin: "16px 16px 0" }}>
      <div className="card-top">
        <h2>{drink.name}</h2>
        {onChange && (
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0 }}
            onClick={onChange}
          >
            別のお酒にする
          </button>
        )}
      </div>
      <p className="term-desc">{drink.explanation}</p>
      <p className="term-desc">
        <strong>おすすめの飲み方：</strong>
        {drink.recommendation}
      </p>
      {drink.pairing && (
        <p className="term-desc">
          <strong>合う料理：</strong>
          {drink.pairing}
        </p>
      )}
    </section>
  );
}

/** メニューやラベルを撮影するか名前で調べてお酒の情報を出し、選んだお酒を記録フォームに渡す */
export default function MenuScan({
  onPick,
  savedPhoto,
  initialDrinks = [],
  onScanned,
}: {
  onPick: (drink: ScannedDrink) => void;
  /** 記録に保存済みの写真。あればそれを読み取るボタンも出す */
  savedPhoto?: Blob | null;
  /** 前に読み取った結果。あれば撮り直さずにその一覧から選べる */
  initialDrinks?: ScannedDrink[];
  /** 読み取れたら結果を親に渡す（続けて別のお酒を記録するときに使う） */
  onScanned?: (drinks: ScannedDrink[]) => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "done">(
    initialDrinks.length ? "done" : "idle",
  );
  const [drinks, setDrinks] = useState<ScannedDrink[]>(initialDrinks);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishDrink[]>([]);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);
  // 食べている料理との相性（お酒の名前ごと）
  const [dish, setDish] = useState("");
  const [pairing, setPairing] = useState<{
    dish: string;
    byName: Map<string, { score: number; reason: string }>;
  } | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
    // これまでの記録から、好みに合いそうなお酒におすすめを付ける
    listRecords().then(setRecords);
    listWishes().then(setWishes);
    setPrefs(loadPrefs());
  }, []);

  const wishOf = (b: ScannedDrink) => wishes.find((w) => w.name === b.name);

  // 今日は飲まないけど次に試したいお酒に印を付ける（もう一度押すと外す）
  async function toggleWish(b: ScannedDrink) {
    const wish = wishOf(b);
    if (wish) {
      await deleteWish(wish.id);
      setWishes((ws) => ws.filter((w) => w.id !== wish.id));
    } else {
      const added = { ...b, id: crypto.randomUUID(), savedAt: Date.now() };
      await putWish(added);
      setWishes((ws) => [added, ...ws]);
    }
  }

  const picks = useMemo(
    () => scoreDrinks(drinks, records, prefs),
    [drinks, records, prefs],
  );
  const best = picks ? bestPick(picks) : -1;

  // 気分を選んだら、その順に並べる（番号はおすすめの計算と同じ、元の並びのまま持つ）
  const [mood, setMood] = useState<string | null>(null);
  // 料理との相性を出したときは、その順を優先する
  const order = useMemo(() => {
    const idx = drinks.map((_, i) => i);
    if (pairing) {
      const s = (i: number) => pairing.byName.get(drinks[i].name)?.score ?? 0;
      return idx.sort((a, b) => s(b) - s(a));
    }
    const m = MOODS.find((x) => x.label === mood);
    return m ? idx.sort((a, b) => m.score(drinks[b]) - m.score(drinks[a])) : idx;
  }, [drinks, mood, pairing]);

  // 前に飲んだお酒と、まだ飲んだことのない産地
  const drunkPlaces = useMemo(
    () => new Set(records.map((r) => placeOf(r) ?? r.origin)),
    [records],
  );
  function badgesOf(b: ScannedDrink) {
    const out: string[] = [];
    const same = records.filter((r) => r.name && r.name === b.name);
    if (same.length > 0)
      out.push(`前に★${Math.max(...same.map((r) => r.overall))}`);
    const place = placeOf(b) ?? b.origin;
    if (records.length > 0 && place && !drunkPlaces.has(place))
      out.push("初めての産地");
    return out;
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await scan(file);
  }

  async function scan(photo: Blob) {
    if (!passcode) return setError("先に合言葉を入れてください");
    setStatus("reading");
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(photo, 1000));
      await request({ image });
    } catch {
      setError("写真を読み込めませんでした");
      setStatus(drinks.length ? "done" : "idle");
    }
  }

  async function lookup() {
    const q = query.trim();
    if (!q) return;
    if (!passcode) return setError("先に合言葉を入れてください");
    // 見つからなかったときは直して調べ直せるよう、入れた名前を残す
    if (await request({ query: q })) setQuery("");
  }

  /** 合言葉を付けて送る。うまくいったら合言葉を覚えておく */
  async function post(payload: object) {
    if (!navigator.onLine)
      throw new Error("オフラインのため調べられません。電波のあるところでもう一度お試しください");
    const res = await fetch("/api/read-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        passcode: passcode.trim().normalize("NFKC"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setSavedPasscode(false);
    if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");
    try {
      localStorage.setItem(PASSCODE_KEY, passcode.trim().normalize("NFKC"));
    } catch {}
    setSavedPasscode(true);
    return data;
  }

  /** いま食べている料理に合う順に並べる */
  async function pairWith() {
    const d = dish.trim();
    if (!d) return;
    if (!passcode) return setError("先に合言葉を入れてください");
    setError("");
    setPairingBusy(true);
    try {
      const data = (await post({
        dish: d,
        drinks: drinks.map(({ name, kind, style }) => ({ name, kind, style })),
      })) as PairingResult;
      const byName = new Map<string, { score: number; reason: string }>();
      for (const r of data.ranks) {
        const drink = drinks[r.index];
        if (drink)
          byName.set(drink.name, {
            score: Math.min(5, Math.max(1, r.score)),
            reason: r.reason,
          });
      }
      setPairing({ dish: d, byName });
      setMood(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "相性を調べられませんでした");
    } finally {
      setPairingBusy(false);
    }
  }

  /** 写真（メニュー・ラベル）か名前を送って、お酒の解説を受け取る */
  async function request(payload: { image: string } | { query: string }) {
    setError("");
    setStatus("reading");
    try {
      const data = await post(payload);
      const found = (data as MenuScanResult).drinks;
      if (found.length === 0)
        throw new Error(
          "query" in payload
            ? "そのお酒が見つかりませんでした。名前を変えて試してみてください"
            : "お酒が見つかりませんでした。メニューやラベルが写るように撮ってみてください",
        );
      // 1本だけ（ラベルや名前で調べたとき）は今の一覧の先頭に足す。メニューなら一覧を入れ替える
      let next = found;
      if (found.length === 1) {
        next = [found[0], ...drinks.filter((d) => d.name !== found[0].name)];
        saveLastScan(next, loadLastScan()?.recorded ?? []);
      } else {
        saveLastScan(next);
        setPairing(null);
      }
      setDrinks(next);
      onScanned?.(next);
      setStatus("done");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus(drinks.length ? "done" : "idle");
      return false;
    }
  }

  return (
    <section className={styles.box} aria-label="メニューやラベルを撮るか、名前で調べて入力">
      <p className={styles.lead}>
        {status === "done"
          ? "「＋ 記録に追加」を押すと、お酒の情報が入った状態で感想を書けます。"
          : "お酒のメニューや瓶・缶のラベルを撮るか、名前を入れて調べると、解説とおすすめの飲み方を出して、記録の項目に入れます。"}
      </p>
      {!savedPasscode && (
        <div className="field">
          <label className="label" htmlFor="scan-pass">
            合言葉
          </label>
          <input
            id="scan-pass"
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

      <label
        className={`btn-primary ${styles.shoot}`}
        aria-disabled={status === "reading"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {status === "reading"
          ? "読み取り中…"
          : status === "done"
            ? "別のメニューやラベルを撮る"
            : "メニューやラベルを撮って読み取る"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          disabled={status === "reading"}
          className="visually-hidden"
        />
      </label>

      {status !== "reading" && (
        <label className="btn-secondary" style={{ cursor: "pointer" }}>
          写真フォルダから選んで読み取る
          {/* capture を付けないとカメラではなく写真の一覧が開く */}
          <input
            type="file"
            accept="image/*"
            onChange={onPhoto}
            className="visually-hidden"
          />
        </label>
      )}

      {savedPhoto && status !== "reading" && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => scan(savedPhoto)}
        >
          保存した写真から読み取る
        </button>
      )}

      {status !== "reading" && (
        <form
          className="row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <label htmlFor="scan-query" className="visually-hidden">
            お酒の名前で調べる
          </label>
          <input
            id="scan-query"
            className="input"
            type="search"
            enterKeyHint="search"
            maxLength={60}
            placeholder="名前で調べる（例：獺祭）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            style={{ flexShrink: 0 }}
            disabled={!query.trim()}
          >
            調べる
          </button>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {drinks.length > 0 && !picks && (
        <p className={styles.lead}>
          記録が{MIN_RECORDS}
          件以上たまるか、「好み」タブの「わたしの好み」を登録すると、好みに合いそうなお酒に「おすすめ」を付けます。
        </p>
      )}
      {drinks.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>
          今回は、これまでの好みとはっきり合うお酒が見つかりませんでした。新しい味を試すチャンスです。
        </p>
      )}

      {drinks.length > 1 && (
        <div
          className={styles.moods}
          role="group"
          aria-label="今日の気分で並べ替え"
        >
          <span>今日の気分：</span>
          {MOODS.map((m) => (
            <button
              type="button"
              key={m.label}
              className="chip"
              aria-pressed={mood === m.label}
              onClick={() => {
                setMood(mood === m.label ? null : m.label);
                setPairing(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {drinks.length > 1 && (
        <form
          className="row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            pairWith();
          }}
        >
          <label htmlFor="scan-dish" className="visually-hidden">
            いま食べている料理
          </label>
          <input
            id="scan-dish"
            className="input"
            type="search"
            enterKeyHint="go"
            maxLength={40}
            placeholder="料理に合う順（例：焼き鳥）"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            style={{ flexShrink: 0 }}
            disabled={!dish.trim() || pairingBusy}
          >
            {pairingBusy ? "調べ中…" : "並べる"}
          </button>
        </form>
      )}
      {pairing && (
        <div
          className="row"
          style={{ alignItems: "center", flexWrap: "nowrap" }}
        >
          <p className={styles.lead} style={{ flex: 1 }}>
            「{pairing.dish}」に合う順に並べました。
          </p>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0 }}
            onClick={() => setPairing(null)}
          >
            元の順に戻す
          </button>
        </div>
      )}

      {order.map((i) => {
        const b = drinks[i];
        const badges = badgesOf(b);
        const match = pairing?.byName.get(b.name);
        return (
          <article
            key={i}
            className={`${styles.drink} ${i === best ? styles.best : ""}`}
          >
            {i === best && picks && (
              <div className={styles.pick}>
                <strong>あなたへのおすすめ</strong>
                <span>{picks[i].reasons.join("、")}</span>
              </div>
            )}
            <h3>{b.name}</h3>
            {match && (
              <p className={styles.match}>
                <strong>
                  {pairing?.dish}との相性{" "}
                  {"●".repeat(match.score) + "○".repeat(5 - match.score)}
                </strong>
                {match.reason}
              </p>
            )}
            {badges.length > 0 && (
              <div className={styles.badges}>
                {badges.map((t) => (
                  <span key={t} className={styles.badge}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="tags">
              {[b.kind, b.style, b.origin].filter(Boolean).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            <TasteBars taste={b.taste} />
            {b.menuNote && (
              <p className="muted">メニューの説明：{b.menuNote}</p>
            )}
            <p className={styles.text}>{b.explanation}</p>
            <p className={styles.text}>
              <strong>おすすめの飲み方：</strong>
              {b.recommendation}
            </p>
            {b.pairing && (
              <p className={styles.text}>
                <strong>合う料理：</strong>
                {b.pairing}
              </p>
            )}
            {b.serveNotes.length > 0 && (
              <details className={styles.methods}>
                <summary>飲み方で比べる</summary>
                <dl>
                  {b.serveNotes.map((m) => (
                    <div key={m.serve} style={{ display: "contents" }}>
                      <dt>{m.serve}</dt>
                      <dd>{m.note}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={() => onPick(b)}
            >
              ＋ 記録に追加
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-pressed={!!wishOf(b)}
              onClick={() => toggleWish(b)}
            >
              {wishOf(b)
                ? "★ 気になるお酒に入れました"
                : "☆ 気になる（次に試す）"}
            </button>
          </article>
        );
      })}
    </section>
  );
}
