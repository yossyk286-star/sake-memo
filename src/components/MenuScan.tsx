"use client";

import { useEffect, useMemo, useState } from "react";
import { type MenuScanResult, type ScannedDrink } from "@/lib/menuScan";
import { placeOf } from "@/lib/origins";
import {
  deleteWish,
  listRecords,
  listWishes,
  putWish,
  type WishDrink,
} from "@/lib/db";
import { saveLastScan } from "@/lib/lastScan";
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

/** メニューを撮影してお酒の情報を読み取り、選んだお酒を記録フォームに渡す */
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
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishDrink[]>([]);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);

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
  const order = useMemo(() => {
    const idx = drinks.map((_, i) => i);
    const m = MOODS.find((x) => x.label === mood);
    return m ? idx.sort((a, b) => m.score(drinks[b]) - m.score(drinks[a])) : idx;
  }, [drinks, mood]);

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

    setError("");
    setStatus("reading");
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(photo, 1000));
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
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
      const result = data as MenuScanResult;
      if (result.drinks.length === 0)
        throw new Error("お酒のメニューが見つかりませんでした");
      setDrinks(result.drinks);
      saveLastScan(result.drinks);
      onScanned?.(result.drinks);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus("idle");
    }
  }

  return (
    <section className={styles.box} aria-label="メニューを撮って入力">
      <p className={styles.lead}>
        {status === "done"
          ? "「＋ 記録に追加」を押すと、お酒の情報が入った状態で感想を書けます。"
          : "お酒のメニューを撮ると、1つずつ解説とおすすめの飲み方を出して、記録の項目に入れます。"}
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
            ? "撮り直す"
            : "メニューを撮って読み取る"}
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
              onClick={() => setMood(mood === m.label ? null : m.label)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {order.map((i) => {
        const b = drinks[i];
        const badges = badgesOf(b);
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
