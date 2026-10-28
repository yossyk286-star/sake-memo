"use client";

import { useEffect, useMemo, useState } from "react";
import { drinkToDraft, type MenuScanResult, type PairingResult, type ScannedDrink } from "@/lib/menuScan";
import { placeOf } from "@/lib/origins";
import {
  deleteWish,
  listRecords,
  listWishes,
  putBottle,
  putWish,
  type WishDrink,
} from "@/lib/db";
import { loadLastScan, saveLastScan, today } from "@/lib/lastScan";
import { loadPasscode, PASSCODE_KEY } from "@/lib/passcode";
import { shrinkPhoto } from "@/lib/photo";
import { EMPTY_PREFS, loadPrefs } from "@/lib/prefs";
import { bestPick, MIN_RECORDS, scoreDrinks } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";
import { abvText } from "@/lib/abv";
import { findCocktail } from "@/lib/cocktails";
import { GENRES, genreColor, genreOf, type Genre } from "@/lib/genre";
import { MOODS, moodFromText, type Mood } from "@/lib/moods";
import MoodPicker from "./MoodPicker";
import { findSaved, forgetSaved, recentSaved, saveLookups } from "@/lib/savedLookups";
import AskAI from "./AskAI";
import Hint from "./Hint";
import TasteBars from "./TasteBars";


/** 調べたお酒について AI に聞くときの質問の例 */
const ASK_SUGGESTIONS = ["どんな味？", "初心者でも飲みやすい？", "どの飲み方がいい？", "合う料理は？"];

/** 閉じたカードに出す、味のひとこと（2つまで） */
function tasteWords({ taste: t }: ScannedDrink) {
  const w = [
    t.sweetness >= 4 && "甘め",
    t.sweetness <= 2 && "辛口",
    t.aroma >= 4 && "香り華やか",
    t.acidity >= 4 && "酸味しっかり",
    t.body >= 4 && "しっかりコク",
    t.body <= 1 && "軽め",
  ].filter((x): x is string => !!x);
  return w.length ? w.slice(0, 2).join("・") : "バランス型";
}

/** 調べたお酒の情報を、AI に渡す文にする */
function drinkContext(d: ScannedDrink) {
  return [
    "メニューやラベルで見つけたお酒（まだ飲んでいません）",
    `お酒：${d.name}`,
    d.kind && `種類：${[d.kind, d.style].filter(Boolean).join("・")}`,
    d.maker && `蔵元・醸造所：${d.maker}`,
    d.origin && `産地：${d.origin}`,
    d.menuNote && `メニューの説明：${d.menuNote}`,
    `解説：${d.explanation}`,
    `おすすめの飲み方：${d.recommendation}`,
  ]
    .filter(Boolean)
    .join("\n");
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
      <p className="term-desc">
        {drink.abv != null && <strong>{abvText(drink.abv, drink.abvStated)}・</strong>}
        {drink.explanation}
      </p>
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
  // 名前で調べている最中はその名前。写真の読み取りと出し分ける
  const [searching, setSearching] = useState<string | null>(null);
  const [drinks, setDrinks] = useState<ScannedDrink[]>(initialDrinks);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // AI を使わずに出したとき、どこから出したか（調べ直すボタン用）
  const [localHit, setLocalHit] = useState<{ name: string; how: string; query: string } | null>(null);
  const [recent, setRecent] = useState<ScannedDrink[]>([]);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [wishes, setWishes] = useState<WishDrink[]>([]);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);
  // 食べている料理との相性（お酒の名前ごと）
  const [dish, setDish] = useState("");
  const [pairing, setPairing] = useState<{
    dish: string;
    /** 料理ではなく、文字で入れた気分を AI に聞いたとき */
    mood?: boolean;
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
    setRecent(recentSaved(8));
  }, []);

  // 調べた結果を一覧から外す（今日の一覧からだけ。前に調べた情報は残るので、また調べても AI は使わない）
  const [undo, setUndo] = useState<{ label: string; drinks: ScannedDrink[] } | null>(null);
  function replaceDrinks(next: ScannedDrink[]) {
    saveLastScan(next, loadLastScan()?.recorded ?? []);
    setDrinks(next);
    onScanned?.(next);
    if (next.length === 0) {
      setStatus("idle");
      setPairing(null);
    }
  }
  function hide(names: string[], label: string) {
    setUndo({ label, drinks });
    setLocalHit(null);
    replaceDrinks(drinks.filter((d) => !names.includes(d.name)));
  }

  // 「前に調べたお酒」の候補を消すモード
  const [editRecent, setEditRecent] = useState(false);
  function forget(name: string) {
    forgetSaved(name);
    const next = recentSaved(8);
    setRecent(next);
    if (next.length === 0) setEditRecent(false);
  }

  const wishOf = (b: ScannedDrink) => wishes.find((w) => w.name === b.name);

  // ラベルを撮った瓶を、家で何回かに分けて飲むお酒として登録する
  const [bottled, setBottled] = useState<string[]>([]);
  async function addBottle(b: ScannedDrink) {
    const d = drinkToDraft(b);
    await putBottle({
      id: crypto.randomUUID(),
      name: d.name,
      kind: d.kind,
      style: d.style,
      maker: d.maker,
      origin: d.origin,
      abv: d.abv,
      note: b.explanation,
      price: null,
      boughtAt: today(),
      finished: false,
      createdAt: Date.now(),
    });
    setBottled((ns) => [...ns, b.name]);
  }

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
  const [mood, setMood] = useState<Mood | null>(null);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  // タップで開いているカード（1杯だけのときは最初から開く）
  const [openCard, setOpenCard] = useState<string | null>(null);
  const genresHere = GENRES.filter((g) => drinks.some((d) => genreOf(d) === g));
  // 調べ直してそのジャンルがなくなったときは絞り込みを外す
  const activeGenre = genre && genresHere.length > 1 && genresHere.includes(genre) ? genre : null;
  // 料理との相性を出したときは、その順を優先する
  const order = useMemo(() => {
    const idx = drinks.map((_, i) => i).filter((i) => !activeGenre || genreOf(drinks[i]) === activeGenre);
    if (pairing) {
      const s = (i: number) => pairing.byName.get(drinks[i].name)?.score ?? 0;
      return idx.sort((a, b) => s(b) - s(a));
    }
    return mood ? idx.sort((a, b) => mood.score(drinks[b]) - mood.score(drinks[a])) : idx;
  }, [drinks, mood, pairing, activeGenre]);
  const sortSummary = [
    activeGenre,
    mood && `気分：${mood.label}`,
    pairing && (pairing.mood ? `気分：${pairing.dish}` : `料理：${pairing.dish}`),
  ]
    .filter(Boolean)
    .join("／");

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

  /** 調べ済みのお酒を一覧の先頭に出す（AI は使わない） */
  function showLocal(d: ScannedDrink, how: string, q: string) {
    const next = [d, ...drinks.filter((x) => x.name !== d.name)];
    saveLastScan(next, loadLastScan()?.recorded ?? []);
    setDrinks(next);
    onScanned?.(next);
    setStatus("done");
    setError("");
    setUndo(null);
    setLocalHit({ name: d.name, how, query: q });
  }

  async function lookup(fresh = false, text = query) {
    const q = text.trim();
    if (!q) return;
    setLocalHit(null);
    // アプリに入っているカクテルと、前に調べたお酒は AI を呼ばずに出す（無料・オフラインでも出る）
    if (!fresh) {
      const cocktail = findCocktail(q);
      if (cocktail) return (showLocal(cocktail, "アプリに入っている情報", q), setQuery(""));
      const saved = findSaved(q);
      if (saved) return (showLocal(saved, "前に調べた情報", q), setQuery(""));
    }
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
  /** 料理か、文字で入れた気分に合う順を AI に聞く */
  async function pairWith(d = dish.trim(), asMood = false) {
    if (!d) return;
    if (!passcode) return setError("先に合言葉を入れてください");
    setError("");
    setPairingBusy(true);
    try {
      const data = (await post({
        [asMood ? "mood" : "dish"]: d,
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
      setPairing({ dish: d, mood: asMood, byName });
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
    setLocalHit(null);
    setSearching("query" in payload ? payload.query : null);
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
      // 次からは AI を呼ばずに出せるよう保存しておく
      saveLookups(found, "query" in payload ? payload.query : undefined);
      setRecent(recentSaved(8));
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
      setUndo(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus(drinks.length ? "done" : "idle");
      return false;
    }
  }

  return (
    <section className={styles.box} aria-label="メニューやラベルを撮るか、名前で調べて入力">
      {status === "done" ? (
        <Hint id="scan-done" className={styles.lead}>
          お酒の名前をタップすると、説明や飲み方が開きます。「＋記録」を押すと、お酒の情報が入った状態で感想を書けます。
        </Hint>
      ) : (
        <p className={styles.lead}>
          お酒のメニューや瓶・缶のラベルを撮るか、名前を入れて調べると、解説とおすすめの飲み方を出して、記録の項目に入れます。
        </p>
      )}
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

      <div className={status === "done" ? styles.shootRow : styles.shootCol}>
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
        {status === "reading" && !searching
          ? "読み取り中…"
          : status === "done"
            ? "撮る"
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
          {status === "done" ? "写真から" : "写真フォルダから選んで読み取る"}
          {/* capture を付けないとカメラではなく写真の一覧が開く */}
          <input
            type="file"
            accept="image/*"
            onChange={onPhoto}
            className="visually-hidden"
          />
        </label>
      )}

      </div>

      {status === "reading" && searching && (
        <p className={styles.lead} role="status">
          「{searching}」を調べています…
        </p>
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
            placeholder="銘柄（例：獺祭）"
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

      {status !== "reading" && recent.length > 0 && (
        <div className="scroll-row" aria-label="前に調べたお酒">
          {recent.map((d) =>
            editRecent ? (
              <button
                key={d.name}
                type="button"
                className={`chip ${styles.forget}`}
                aria-label={`${d.name}を前に調べたお酒から消す`}
                onClick={() => forget(d.name)}
              >
                {d.name} ✕
              </button>
            ) : (
              <button key={d.name} type="button" className="chip" onClick={() => lookup(false, d.name)}>
                {d.name}
              </button>
            ),
          )}
          <button
            type="button"
            className={`chip ${styles.editChip}`}
            aria-pressed={editRecent}
            onClick={() => setEditRecent(!editRecent)}
          >
            {editRecent ? "完了" : "✎ 消す"}
          </button>
        </div>
      )}
      {localHit && (
        <p className={styles.lead} style={{ margin: 0 }}>
          「{localHit.name}」は{localHit.how}から出しました（AI は使っていません）。{" "}
          {passcode && (
            <button type="button" className="btn-ghost" style={{ height: 28, padding: "0 8px", fontSize: 12 }} onClick={() => lookup(true, localHit.query)}>
              AI で調べ直す
            </button>
          )}
        </p>
      )}
      {undo && (
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <p className={styles.lead} style={{ flex: 1, margin: 0 }} role="status">
            {undo.label}を一覧から外しました。
          </p>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0 }}
            onClick={() => {
              replaceDrinks(undo.drinks);
              setStatus("done");
              setUndo(null);
            }}
          >
            元に戻す
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {drinks.length > 0 && !picks && (
        <Hint id="scan-picks" className={styles.lead}>
          記録が{MIN_RECORDS}
          件以上たまるか、「好み」タブの「わたしの好み」を登録すると、好みに合いそうなお酒に「おすすめ」を付けます。
        </Hint>
      )}
      {drinks.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>
          今回は、これまでの好みとはっきり合うお酒が見つかりませんでした。新しい味を試すチャンスです。
        </p>
      )}

      {drinks.length > 1 && (
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <button
            type="button"
            className="chip"
            aria-expanded={sortOpen}
            aria-pressed={sortOpen}
            onClick={() => setSortOpen(!sortOpen)}
          >
            ⇅ 並び替え・絞り込み
          </button>
          {sortSummary && <span className={styles.sortNow}>{sortSummary}</span>}
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0, marginLeft: "auto" }}
            onClick={() => hide(drinks.map((d) => d.name), `${drinks.length}杯すべて`)}
          >
            すべて消す
          </button>
        </div>
      )}
      {drinks.length > 1 && sortOpen && (
        <div className={styles.sortPanel}>
      {genresHere.length > 1 && (
        <div className="scroll-row" role="group" aria-label="ジャンルで絞り込み">
          {genresHere.map((g) => (
            <button
              key={g}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": genreColor(g) } as React.CSSProperties}
              aria-pressed={activeGenre === g}
              onClick={() => setGenre(activeGenre === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {drinks.length > 1 && (
        <MoodPicker
          labels={MOODS.map((m) => m.label)}
          suggest={(q) => MOODS.filter((m) => m.label.includes(q) || m.words.test(q)).map((m) => m.label)}
          value={mood?.label ?? (pairing?.mood ? pairing.dish : null)}
          busy={pairingBusy}
          onPick={(label) => {
            setMood(MOODS.find((m) => m.label === label) ?? null);
            setPairing((p) => (label || p?.mood ? null : p));
          }}
          onText={(t) => {
            const m = moodFromText(t);
            if (m) {
              setMood(m);
              setPairing(null);
            } else pairWith(t, true);
          }}
        />
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
        </div>
      )}
      {mood && !MOODS.some((m) => m.label === mood.label) && (
        <p className={styles.lead}>「{mood.label}」に合いそうな順に並べました（AI は使っていません）。</p>
      )}

      {pairing && (
        <div
          className="row"
          style={{ alignItems: "center", flexWrap: "nowrap" }}
        >
          <p className={styles.lead} style={{ flex: 1 }}>
            {pairing.mood
              ? `「${pairing.dish}」の気分に合う順に並べました。`
              : `「${pairing.dish}」に合う順に並べました。`}
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
        const open = drinks.length === 1 || openCard === b.name;
        const wished = !!wishOf(b);
        return (
          <article
            key={i}
            className={`${styles.drink} ${i === best ? styles.best : ""}`}
          >
            {/* 右上の角に置き、度数や「＋記録」から離して押し間違いを防ぐ */}
            <button
              type="button"
              className={styles.remove}
              aria-label={`${b.name}を一覧から外す`}
              onClick={() => hide([b.name], `「${b.name}」`)}
            >
              ✕
            </button>
            {i === best && picks && (
              <div className={styles.pick}>
                <strong>あなたへのおすすめ</strong>
                <span>{picks[i].reasons.join("、")}</span>
              </div>
            )}
            <button
              type="button"
              className={styles.cardHead}
              aria-expanded={open}
              onClick={() => setOpenCard(open ? null : b.name)}
            >
              <span className={styles.cardTop}>
                <span className={styles.name}>{b.name}</span>
                {b.abv != null && <span className={styles.abv}>{abvText(b.abv, b.abvStated)}</span>}
              </span>
            </button>
            {open && (
              <>
                {match && (
                  <p className={styles.match}>
                    <strong>
                      {pairing?.mood ? "気分に合う度" : `${pairing?.dish}との相性`}{" "}
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
                  {[b.kind, b.style, b.origin].filter((t): t is string => !!t).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <TasteBars taste={b.taste} />
                {b.menuNote && <p className="muted">メニューの説明：{b.menuNote}</p>}
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
                <details className={styles.methods}>
                  <summary>AI に聞く</summary>
                  <AskAI bare context={drinkContext(b)} suggestions={ASK_SUGGESTIONS} />
                </details>
              </>
            )}
            <div className={styles.actions}>
              {!open && (
                <button type="button" className={styles.oneLine} onClick={() => setOpenCard(b.name)}>
                  {match && `${"●".repeat(match.score)}${"○".repeat(5 - match.score)} `}
                  {tasteWords(b)}｜{[b.kind, b.style].filter(Boolean).join("・") || "種類不明"}
                </button>
              )}
              <button
                type="button"
                className={`${styles.act} ${styles.actMain}`}
                style={open ? { flex: 1 } : undefined}
                onClick={() => onPick(b)}
              >
                ＋記録
              </button>
              <button
                type="button"
                className={styles.act}
                aria-pressed={wished}
                aria-label={wished ? "気になるから外す" : "気になる（次に試す）"}
                onClick={() => toggleWish(b)}
              >
                {wished ? "★" : "☆"}
              </button>
              {open ? (
                <button
                  type="button"
                  className={styles.act}
                  disabled={bottled.includes(b.name)}
                  aria-label="家のお酒に登録（買って家にあるお酒）"
                  onClick={() => addBottle(b)}
                >
                  {bottled.includes(b.name) ? "家のお酒 ✓" : "＋家のお酒"}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.act}
                  aria-label="詳しく見る"
                  onClick={() => setOpenCard(b.name)}
                >
                  ⋯
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
