"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { drinkToDraft, type MenuScanResult, type DishIdeas, type PairingResult, type ScannedDrink } from "@/lib/menuScan";
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
import Skeleton from "./Skeleton";
import { announceBuddy } from "@/lib/buddy";
import { bestPick, MIN_RECORDS, scoreDrinks } from "@/lib/recommend";
import type { TastingRecord } from "@/lib/types";
import styles from "./MenuScan.module.css";
import { abvText } from "@/lib/abv";
import { findCocktail } from "@/lib/cocktails";
import { loadDishRanks, loadTodayMenu, saveDishRanks, type FoodMenu, type MenuRank } from "@/lib/foodPairing";
import { GENRES, genreColor, genreOf, type Genre } from "@/lib/genre";
import { MOODS, moodFromText, wordMatch } from "@/lib/moods";
import MoodPicker from "./MoodPicker";
import { findSaved, saveLookups } from "@/lib/savedLookups";
import AskAI from "./AskAI";
import Hint from "./Hint";
import MenuPicks, { scoreWord } from "./MenuPicks";
import TasteBars from "./TasteBars";
import { getLang, tr, trJoin, trv } from "@/lib/i18n";

/** 相棒が「好きなやつ」を教えた一覧。アプリを開いている間は同じ一覧で何度も言わない */
const announcedScans = new Set<string>();

/** 調べたお酒について AI に聞くときの質問の例 */
const ASK_SUGGESTIONS = ["どんな味？", "初心者でも飲みやすい？", "どの飲み方がいい？", "合う料理は？"];
/** 写真フォルダから一度に選べる枚数（1枚ずつ AI に送るので、多すぎると時間とお金がかかる） */
const MAX_PHOTOS = 5;

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
  return w.length ? trJoin(w.slice(0, 2)) : tr("バランス型");
}

/** 調べたお酒の情報を、AI に渡す文にする */
function drinkContext(d: ScannedDrink) {
  return [
    "メニューやラベルで見つけたお酒（まだ飲んでいません）",
    tr("お酒：{0}", d.name),
    d.kind && tr("種類：{0}", [d.kind, d.style].filter(Boolean).join("・")),
    d.maker && tr("蔵元・醸造所：{0}", d.maker),
    d.origin && tr("産地：{0}", d.origin),
    d.menuNote && tr("メニューの説明：{0}", d.menuNote),
    tr("解説：{0}", d.explanation),
    tr("おすすめの飲み方：{0}", d.recommendation),
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
        <h2>{trv(drink.name)}</h2>
        {onChange && (
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0 }}
            onClick={onChange}
          >
            {tr("別のお酒にする")}
          </button>
        )}
      </div>
      <p className="term-desc">
        {drink.abv != null && <strong>{tr("{0}・", abvText(drink.abv, drink.abvStated))}</strong>}
        {trv(drink.explanation)}
      </p>
      <p className="term-desc">
        <strong>{tr("おすすめの飲み方：")}</strong>
        {trv(drink.recommendation)}
      </p>
      {drink.pairing && (
        <p className="term-desc">
          <strong>{tr("合う料理：")}</strong>
          {trv(drink.pairing)}
        </p>
      )}
    </section>
  );
}

/** 一覧の絞り込み用。全角半角・大文字小文字・ひらがなカタカナの違いを無視する */
function findKey(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/\s+/g, "");
}

/** 選んだ気分 1つを、味で並べる気分と、入っていてほしい言葉に分ける。どちらでもなければ両方 null */
function partOf(word: string, drinks: ScannedDrink[]) {
  const mood = moodFromText(word);
  const must = wordMatch(word);
  // 一覧の気分そのものでなく、説明にその言葉が出てくるときは、入っているものを上にまとめる（「ベリー」など）
  const literal = !MOODS.some((m) => m.label === word) && drinks.some(must);
  return { label: word, mood, must: literal ? must : null };
}

function findText(d: ScannedDrink) {
  return [d.name, d.kind, d.style, d.origin, d.menuNote].filter(Boolean).join(" ");
}

/** メニューやラベルを撮影するか名前で調べてお酒の情報を出し、選んだお酒を記録フォームに渡す */
export default function MenuScan({
  onPick,
  savedPhoto,
  initialDrinks = [],
  onScanned,
  extra,
}: {
  onPick: (drink: ScannedDrink) => void;
  /** 記録に保存済みの写真。あればそれを読み取るボタンも出す */
  savedPhoto?: Blob | null;
  /** 前に読み取った結果。あれば撮り直さずにその一覧から選べる */
  initialDrinks?: ScannedDrink[];
  /** 読み取れたら結果を親に渡す（続けて別のお酒を記録するときに使う） */
  onScanned?: (drinks: ScannedDrink[]) => void;
  /** 調べ方の下に出すもの（料理から選ぶへの入口など） */
  extra?: React.ReactNode;
}) {
  const [passcode, setPasscode] = useState("");
  const [savedPasscode, setSavedPasscode] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "done">(
    initialDrinks.length ? "done" : "idle",
  );
  // 名前で調べている最中はその名前。写真の読み取りと出し分ける
  const [searching, setSearching] = useState<string | null>(null);
  const [drinks, setDrinks] = useState<ScannedDrink[]>(initialDrinks);
  // 写真を何枚か続けて読み取るとき、前の写真の結果に足していけるよう最新の一覧を持っておく
  const drinksRef = useRef(drinks);
  useEffect(() => {
    drinksRef.current = drinks;
  }, [drinks]);
  // 何枚か選んだときの「何枚目を読み取り中か」
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // 名前で調べる欄は「文字で」を押したときだけ出す（まめメモと同じ）
  const [textOpen, setTextOpen] = useState(false);
  // AI を使わずに出したとき、どこから出したか（調べ直すボタン用）
  const [localHit, setLocalHit] = useState<{ name: string; how: string; query: string } | null>(null);
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
  // 同じお店で今日読み取った料理メニュー。お酒ごとに合う料理を出し、料理で並べるときの候補にする
  const [foodMenu, setFoodMenu] = useState<FoodMenu["dishes"]>([]);
  // お酒ごとに、料理メニューの中から合う順を聞いた結果と、聞いているお酒
  const [dishRanks, setDishRanks] = useState<Record<string, MenuRank[]>>({});
  const [dishRanking, setDishRanking] = useState<string | null>(null);
  const [dishRankError, setDishRankError] = useState<{ name: string; text: string } | null>(null);
  // 料理メニューをまだ読み取っていないときに「合う料理を探す」で挙げてもらった料理
  const [dishIdeas, setDishIdeas] = useState<Record<string, MenuRank[]>>({});

  // localStorage はブラウザでしか読めないので、表示後に読み込む
  useEffect(() => {
    const saved = loadPasscode();
    setPasscode(saved);
    setSavedPasscode(!!saved);
    // これまでの記録から、好みに合いそうなお酒におすすめを付ける
    listRecords().then(setRecords);
    listWishes().then(setWishes);
    setPrefs(loadPrefs());
    const menu = loadTodayMenu();
    setFoodMenu(menu);
    setDishRanks(loadDishRanks(menu));
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
    if (!confirm(tr("{0}を一覧から消しますか？", label))) return;
    setUndo({ label, drinks });
    setLocalHit(null);
    replaceDrinks(drinks.filter((d) => !names.includes(d.name)));
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
  // 好みど真ん中のお酒があれば、相棒がそっと教える（同じ一覧では1回だけ）
  useEffect(() => {
    if (best < 0) return;
    const key = drinks.map((d) => d.name).join("|");
    if (announcedScans.has(key)) return;
    announcedScans.add(key);
    announceBuddy({ mood: "happy", text: tr("「{0}」、きっと好きなやつだよ", drinks[best].name) });
  }, [best, drinks]);

  // 気分を選んだら、その順に並べる（番号はおすすめの計算と同じ、元の並びのまま持つ）。いくつでも選べる
  const [moodWords, setMoodWords] = useState<string[]>([]);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  // 一覧が多くなったときに名前や種類で絞る
  const [find, setFind] = useState("");
  // タップで開いているカード（1杯だけのときは最初から開く）
  const [openCard, setOpenCard] = useState<string | null>(null);
  const genresHere = GENRES.filter((g) => drinks.some((d) => genreOf(d) === g));
  // 調べ直してそのジャンルがなくなったときは絞り込みを外す
  const activeGenre = genre && genresHere.length > 1 && genresHere.includes(genre) ? genre : null;
  // 選んだ気分を、味で並べるもの（甘口など）と、入っていてほしい言葉（ジンなど）に分ける。
  // どちらでもない言葉があれば AI に聞く
  const moodParts = useMemo(
    () => moodWords.map((w) => partOf(w, drinks)),
    [moodWords, drinks],
  );
  const moodLocal = moodParts.length > 0 && moodParts.every((p) => p.mood || p.must);
  const mustWords = moodParts.filter((p) => p.must).map((p) => tr("「{0}」", p.label)).join("");
  // 料理との相性を出したときは、その順を優先する
  const { order, hits } = useMemo(() => {
    const key = findKey(find);
    const idx = drinks
      .map((_, i) => i)
      .filter((i) => !activeGenre || genreOf(drinks[i]) === activeGenre)
      .filter((i) => !key || findKey(findText(drinks[i])).includes(key));
    if (pairing) {
      const s = (i: number) => pairing.byName.get(drinks[i].name)?.score ?? 0;
      return { order: idx.sort((a, b) => s(b) - s(a)), hits: null };
    }
    if (!moodLocal) return { order: idx, hits: null };
    // 気分ごとに点の幅が違うので、0〜1 にそろえてから足す
    const total = new Map(idx.map((i) => [i, 0]));
    for (const m of moodParts.flatMap((p) => (p.mood ? [p.mood] : []))) {
      const s = idx.map((i) => m.score(drinks[i]));
      const lo = Math.min(...s);
      const span = Math.max(...s) - lo || 1;
      idx.forEach((i, n) => total.set(i, total.get(i)! + (s[n] - lo) / span));
    }
    // 「ジン」など言葉で入れたものは、全部入っているお酒を上にまとめる
    const musts = moodParts.flatMap((p) => (p.must ? [p.must] : []));
    const ok = (i: number) => musts.every((f) => f(drinks[i]));
    const sorted = idx.sort((a, b) => Number(ok(b)) - Number(ok(a)) || total.get(b)! - total.get(a)!);
    return { order: sorted, hits: musts.length > 0 ? sorted.filter(ok).length : null };
  }, [drinks, moodParts, moodLocal, pairing, activeGenre, find]);
  const sortSummary = [
    activeGenre && tr(activeGenre),
    moodWords.length > 0 && !pairing && tr("気分：{0}", trJoin(moodWords)),
    pairing && (pairing.mood ? tr("気分：{0}", pairing.dish) : tr("料理：{0}", pairing.dish)),
  ]
    .filter(Boolean)
    .join(tr("／"));

  // 前に飲んだお酒と、まだ飲んだことのない産地
  const drunkPlaces = useMemo(
    () => new Set(records.map((r) => placeOf(r) ?? r.origin)),
    [records],
  );
  function badgesOf(b: ScannedDrink) {
    const out: string[] = [];
    const same = records.filter((r) => r.name && r.name === b.name);
    if (same.length > 0)
      out.push(tr("前に★{0}", Math.max(...same.map((r) => r.overall))));
    const place = placeOf(b) ?? b.origin;
    if (records.length > 0 && place && !drunkPlaces.has(place))
      out.push("初めての産地");
    return out;
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    // 写真フォルダからは何枚か選べる（表と裏など）。1枚ずつ順に読み取って一覧に足す
    const picked = [...(e.target.files ?? [])];
    e.target.value = "";
    const files = picked.slice(0, MAX_PHOTOS);
    if (files.length === 0) return;
    if (!passcode) return setError("先に合言葉を入れてください");
    let failed = 0;
    for (const [i, file] of files.entries()) {
      if (files.length > 1) setProgress({ at: i + 1, of: files.length });
      if (!(await scan(file))) failed++;
    }
    setProgress(null);
    if (files.length > 1 && failed > 0)
      setError(tr("{0}枚のうち{1}枚は読み取れませんでした。その写真だけ撮り直してみてください", files.length, failed));
    else if (picked.length > MAX_PHOTOS && failed === 0)
      setError(tr("一度に読み取れるのは{0}枚までです。残りはもう一度選んでください", MAX_PHOTOS));
  }

  async function scan(photo: Blob) {
    if (!passcode) {
      setError("先に合言葉を入れてください");
      return false;
    }
    setStatus("reading");
    try {
      // 料金は画像の大きさで決まるので、長辺1000pxまで縮めてから送る
      const image = await blobToBase64(await shrinkPhoto(photo, 1000));
      return await request({ image });
    } catch {
      setError("写真を読み込めませんでした");
      setStatus(drinksRef.current.length ? "done" : "idle");
      return false;
    }
  }

  /** 調べ済みのお酒を一覧の先頭に出す（AI は使わない） */
  function showLocal(d: ScannedDrink, how: string, q: string) {
    const next = [d, ...drinks.filter((x) => x.name !== d.name)];
    saveLastScan(next, loadLastScan()?.recorded ?? []);
    setDrinks(next);
    onScanned?.(next);
    setStatus("done");
    setTextOpen(false);
    setError("");
    setUndo(null);
    setLocalHit({ name: d.name, how, query: q });
    setOpenCard(d.name);
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
    if (await request({ query: q })) {
      setQuery("");
      setTextOpen(false);
    }
  }

  /** サーバーが理由を返さなかったとき（時間切れ・写真が大きすぎるなど）の説明 */
  function fallbackError(status: number) {
    if (status === 504) return "時間がかかりすぎて読み取れませんでした。写すお酒を減らして撮ってみてください";
    if (status === 413) return "写真が大きすぎます。もう少し離れて撮ってみてください";
    return tr("読み取りに失敗しました（エラー {0}）。少し待ってからもう一度お試しください", status);
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
        lang: getLang(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setSavedPasscode(false);
    if (!res.ok) throw new Error(data.error ?? fallbackError(res.status));
    try {
      localStorage.setItem(PASSCODE_KEY, passcode.trim().normalize("NFKC"));
    } catch {}
    setSavedPasscode(true);
    return data;
  }

  /** 今日読み取った料理メニューを、このお酒に合う順に AI に並べてもらう */
  async function rankDishes(b: ScannedDrink) {
    if (dishRanking) return;
    if (!passcode) return setDishRankError({ name: b.name, text: "先に合言葉を入れてください" });
    setDishRankError(null);
    setDishRanking(b.name);
    try {
      const data = (await post({
        drink: { name: b.name, kind: b.kind, style: b.style },
        dishes: foodMenu.map((m) => m.dish),
      })) as PairingResult | DishIdeas;
      if ("ideas" in data) {
        const ideas = data.ideas.map((r) => ({ name: r.dish, score: Math.min(5, Math.max(1, r.score)), reason: r.reason }));
        setDishIdeas((prev) => ({ ...prev, [b.name]: ideas }));
        return;
      }
      const ranks = data.ranks
        .filter((r) => foodMenu[r.index])
        .map((r) => ({ name: foodMenu[r.index].dish, score: Math.min(5, Math.max(1, r.score)), reason: r.reason }))
        .sort((x, y) => y.score - x.score);
      const next = { ...dishRanks, [b.name]: ranks };
      setDishRanks(next);
      saveDishRanks(foodMenu, next);
    } catch (err) {
      setDishRankError({ name: b.name, text: err instanceof Error ? err.message : "調べられませんでした" });
    } finally {
      setDishRanking(null);
    }
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
      if (!asMood) setMoodWords([]);
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
      // 今読み取ったお酒を今日の一覧の上に足す（表と裏など何枚かに分かれたメニューを続けて撮っても、新しい分がすぐ見えるように）
      const next = [...found, ...drinksRef.current.filter((d) => !found.some((f) => f.name === d.name))];
      drinksRef.current = next;
      if (found.length > 1) setPairing(null);
      saveLastScan(next, loadLastScan()?.recorded ?? []);
      setDrinks(next);
      onScanned?.(next);
      setStatus("done");
      setUndo(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setStatus(drinksRef.current.length ? "done" : "idle");
      return false;
    }
  }

  return (
    <section className={styles.box} aria-label={tr("メニューやラベルを撮るか、名前で調べて入力")}>
      {status === "done" ? (
        <Hint id="scan-done" className={styles.lead}>
          {tr("お酒の名前をタップすると、説明や飲み方が開きます。「＋記録」を押すと、お酒の情報が入った状態で感想を書けます。")}
        </Hint>
      ) : (
        <p className={styles.lead}>
          {tr("お酒のメニューや瓶・缶のラベルを撮るか、名前を入れて調べると、解説とおすすめの飲み方を出して、記録の項目に入れます。")}
        </p>
      )}
      {!savedPasscode && (
        <div className="field">
          <label className="label" htmlFor="scan-pass">
            {tr("合言葉")}
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
          ? progress
            ? tr("読み取り中…（{0}/{1}枚）", progress.at, progress.of)
            : tr("読み取り中…")
          : status === "done"
            ? tr("撮る")
            : tr("メニューやラベルを撮って読み取る")}
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
          {status === "done" ? tr("写真から") : tr("写真フォルダから選んで読み取る")}
          {/* capture を付けないとカメラではなく写真の一覧が開く */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhoto}
            className="visually-hidden"
          />
        </label>
      )}

        {status === "done" && !textOpen && (
          <button type="button" className="btn-secondary" onClick={() => setTextOpen(true)}>
            {tr("文字で")}
          </button>
        )}
      </div>
      {status === "done" && (
        <dl className={styles.howTo}>
          <dt>{tr("撮る・写真から")}</dt>
          <dd>{tr("メニューやラベルを読み取る")}</dd>
          <dt>{tr("文字で")}</dt>
          <dd>{tr("お酒の名前を打って調べる")}</dd>
        </dl>
      )}

      {status === "reading" && (
        <Skeleton
          label={searching ? tr("「{0}」を調べています…", searching) : tr("メニューを読み取っています…")}
          cards={searching ? 1 : 3}
          lines={searching ? 3 : 2}
        />
      )}

      {savedPhoto && status !== "reading" && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => scan(savedPhoto)}
        >
          {tr("保存した写真から読み取る")}
        </button>
      )}

      {status !== "reading" &&
        (textOpen ? (
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
          >
            <label className="label" htmlFor="scan-query">
              {tr("お酒の名前")}
            </label>
            <input
              id="scan-query"
              className="input"
              type="search"
              enterKeyHint="search"
              maxLength={60}
              autoFocus
              placeholder={tr("例：獺祭 純米大吟醸45、シャブリ")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={!query.trim()}>
              {tr("この名前で調べる")}
            </button>
          </form>
        ) : (
          status !== "done" && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setTextOpen(true)}
            >
              {tr("文字で入力して調べる")}
            </button>
          )
        ))}

      {status !== "reading" && extra}

      {undo && (
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <p className={styles.lead} style={{ flex: 1, margin: 0 }} role="status">
            {tr("{0}を一覧から外しました。", undo.label)}
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
            {tr("元に戻す")}
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {trv(error)}
        </p>
      )}

      {drinks.length > 0 && !picks && (
        <Hint id="scan-picks" className={styles.lead}>
          {tr("記録が{0}件以上たまるか、「好み」タブの「わたしの好み」を登録すると、好みに合いそうなお酒に「おすすめ」を付けます。", MIN_RECORDS)}
        </Hint>
      )}
      {drinks.length > 0 && picks && best < 0 && (
        <p className={styles.lead}>
          {tr("今回は、これまでの好みとはっきり合うお酒が見つかりませんでした。新しい味を試すチャンスです。")}
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
            {tr("⇅ 並び替え")}
          </button>
          <input
            className={`input ${styles.find}`}
            type="search"
            enterKeyHint="search"
            aria-label={tr("一覧を名前や種類で絞り込む")}
            placeholder={tr("名前・種類で探す")}
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
        </div>
      )}
      {drinks.length > 1 && sortSummary && <p className={styles.sortNow}>{trv(sortSummary)}</p>}
      {drinks.length > 1 && find.trim() && order.length === 0 && (
        <p className={styles.lead}>{tr("「{0}」に当てはまるお酒はありません。", find.trim())}</p>
      )}
      {drinks.length > 1 && sortOpen && (
        <div className={styles.sortPanel}>
      {genresHere.length > 1 && (
        <div className="scroll-row" role="group" aria-label={tr("ジャンルで絞り込み")}>
          {genresHere.map((g) => (
            <button
              key={g}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": genreColor(g) } as React.CSSProperties}
              aria-pressed={activeGenre === g}
              onClick={() => setGenre(activeGenre === g ? null : g)}
            >
              {trv(g)}
            </button>
          ))}
        </div>
      )}

      {drinks.length > 1 && (
        <MoodPicker
          labels={MOODS.map((m) => m.label)}
          suggest={(q) => MOODS.filter((m) => m.label.includes(q) || m.words.test(q)).map((m) => m.label)}
          values={moodWords}
          busy={pairingBusy}
          onChange={(words) => {
            setMoodWords(words);
            setPairing((p) => (words.length > 0 || p?.mood ? null : p));
            // わからない言葉が入っているときは、選んだ気分をまとめて AI に聞く
            if (words.some((w) => !partOf(w, drinks).mood && !partOf(w, drinks).must))
              pairWith(words.join("・"), true);
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
            {tr("いま食べている料理")}
          </label>
          <input
            id="scan-dish"
            className="input"
            type="search"
            enterKeyHint="go"
            maxLength={40}
            placeholder={tr("料理に合う順（例：焼き鳥）")}
            value={dish}
            onChange={(e) => setDish(e.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            style={{ flexShrink: 0 }}
            disabled={!dish.trim() || pairingBusy}
          >
            {pairingBusy ? tr("調べ中…") : tr("並べる")}
          </button>
        </form>
      )}
      {drinks.length > 1 && foodMenu.length > 0 && (
        <div className="scroll-row" aria-label={tr("さっき読み取った料理")}>
          {foodMenu.map(({ dish: d }) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={!pairing?.mood && pairing?.dish === d}
              disabled={pairingBusy}
              onClick={() => {
                setDish(d);
                pairWith(d);
              }}
            >
              {trv(d)}
            </button>
          ))}
        </div>
      )}
        </div>
      )}
      {pairingBusy && <Skeleton label={tr("合う順を考えています…")} cards={2} lines={1} />}
      {moodLocal && !pairingBusy && (moodWords.length > 1 || moodWords.some((w) => !MOODS.some((m) => m.label === w))) && (
        <p className={styles.lead}>
          {tr("{0}に合いそうな順に並べました", moodWords.map((w) => tr("「{0}」", w)).join(""))}
          {hits === null
            ? ""
            : hits === 0
              ? tr("。{0}が入っているものは見つかりませんでした", mustWords)
              : tr("。{0}が入っているのは{1}杯です", mustWords, hits)}
          {tr("（AI は使っていません）。")}
        </p>
      )}

      {pairing && (
        <div
          className="row"
          style={{ alignItems: "center", flexWrap: "nowrap" }}
        >
          <p className={styles.lead} style={{ flex: 1 }}>
            {pairing.mood
              ? tr("「{0}」の気分に合う順に並べました。", pairing.dish)
              : tr("「{0}」に合う順に並べました。", pairing.dish)}
          </p>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: 36, padding: "0 12px", flexShrink: 0 }}
            onClick={() => setPairing(null)}
          >
            {tr("元の順に戻す")}
          </button>
        </div>
      )}

      {order.map((i, n) => {
        const b = drinks[i];
        const badges = badgesOf(b);
        const match = pairing?.byName.get(b.name);
        const open = drinks.length === 1 || openCard === b.name;
        const wished = !!wishOf(b);
        return (
          <Fragment key={i}>
          {n > 0 && n === hits && (
            <p className={styles.lead}>{tr("ここから下は{0}が入っていないもの", mustWords)}</p>
          )}
          <article
            className={`${styles.drink} ${i === best ? styles.best : ""}`}
          >
            {/* 右上の角に置き、度数や「＋記録」から離して押し間違いを防ぐ */}
            <button
              type="button"
              className={styles.remove}
              aria-label={tr("{0}を一覧から外す", b.name)}
              onClick={() => hide([b.name], tr("「{0}」", b.name))}
            >
              ✕
            </button>
            {i === best && picks && (
              <div className={styles.pick}>
                <strong>{tr("あなたへのおすすめ")}</strong>
                <span>{trJoin(picks[i].reasons, "、")}</span>
              </div>
            )}
            <button
              type="button"
              className={styles.cardHead}
              aria-expanded={open}
              onClick={() => setOpenCard(open ? null : b.name)}
            >
              <span className={styles.cardTop}>
                <span className={styles.name}>{trv(b.name)}</span>
                {b.abv != null && <span className={styles.abv}>{abvText(b.abv, b.abvStated)}</span>}
              </span>
            </button>
            {open && (
              <>
                {match && (
                  <p className={styles.match}>
                    <strong>
                      {pairing?.mood ? tr("気分に合う度") : tr("{0}との相性", pairing?.dish)}{" "}
                      {scoreWord(match.score)} {"●".repeat(match.score) + "○".repeat(5 - match.score)}
                    </strong>
                    {trv(match.reason)}
                  </p>
                )}
                {badges.length > 0 && (
                  <div className={styles.badges}>
                    {badges.map((t) => (
                      <span key={t} className={styles.badge}>
                        {trv(t)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="tags">
                  {[b.kind, b.style, b.origin].filter((t): t is string => !!t).map((t) => (
                    <span key={t} className="tag">
                      {trv(t)}
                    </span>
                  ))}
                </div>
                <TasteBars taste={b.taste} />
                {b.menuNote && <p className="muted">{tr("メニューの説明：{0}", b.menuNote)}</p>}
                <p className={styles.text}>{trv(b.explanation)}</p>
                <p className={styles.text}>
                  <strong>{tr("おすすめの飲み方：")}</strong>
                  {trv(b.recommendation)}
                </p>
                {b.pairing && (
                  <p className={styles.text}>
                    <strong>{tr("合う料理：")}</strong>
                    {trv(b.pairing)}
                  </p>
                )}
                {localHit?.name === b.name && (
                  <p className={styles.localNote}>
                    {tr("{0}から出しました（AI は使っていません）", localHit.how)}
                    {passcode && (
                      <>
                        {" "}
                        <button type="button" className={styles.relook} onClick={() => lookup(true, localHit.query)}>
                          {tr("AI で調べ直す")}
                        </button>
                      </>
                    )}
                  </p>
                )}
                <div style={{ "--kind": genreColor(genreOf(b)) } as React.CSSProperties}>
                  {foodMenu.length > 0 ? (
                    <MenuPicks
                      label={tr("さっきの料理メニューなら")}
                      button={tr("さっきの料理メニューから選ぶ")}
                      ranks={dishRanks[b.name]}
                      busy={dishRanking === b.name}
                      error={dishRankError?.name === b.name ? dishRankError.text : ""}
                      onAsk={() => rankDishes(b)}
                    />
                  ) : (
                    <MenuPicks
                      label={tr("このお酒に合う料理")}
                      button={tr("合う料理を探す")}
                      ranks={dishIdeas[b.name]}
                      busy={dishRanking === b.name}
                      error={dishRankError?.name === b.name ? dishRankError.text : ""}
                      onAsk={() => rankDishes(b)}
                    />
                  )}
                </div>
                {b.serveNotes.length > 0 && (
                  <details className={styles.methods}>
                    <summary>{tr("飲み方で比べる")}</summary>
                    <dl>
                      {b.serveNotes.map((m) => (
                        <div key={m.serve} style={{ display: "contents" }}>
                          <dt>{trv(m.serve)}</dt>
                          <dd>{trv(m.note)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                <details className={styles.methods}>
                  <summary>{tr("AI に聞く")}</summary>
                  <AskAI bare context={drinkContext(b)} suggestions={ASK_SUGGESTIONS} />
                </details>
              </>
            )}
            <div className={styles.actions}>
              {!open && (
                <button type="button" className={styles.oneLine} onClick={() => setOpenCard(b.name)}>
                  {match && `${"●".repeat(match.score)}${"○".repeat(5 - match.score)} `}
                  {tasteWords(b)}｜{trJoin([b.kind, b.style]) || tr("種類不明")}
                </button>
              )}
              <button
                type="button"
                className={`${styles.act} ${styles.actMain}`}
                style={open ? { flex: 1 } : undefined}
                onClick={() => onPick(b)}
              >
                {tr("＋記録")}
              </button>
              <button
                type="button"
                className={styles.act}
                aria-pressed={wished}
                aria-label={wished ? tr("気になるから外す") : tr("気になる（次に試す）")}
                onClick={() => toggleWish(b)}
              >
                {wished ? "★" : "☆"}
              </button>
              {open ? (
                <button
                  type="button"
                  className={styles.act}
                  disabled={bottled.includes(b.name)}
                  aria-label={tr("家のお酒に登録（買って家にあるお酒）")}
                  onClick={() => addBottle(b)}
                >
                  {bottled.includes(b.name) ? tr("家のお酒 ✓") : tr("＋家のお酒")}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.act}
                  aria-label={tr("詳しく見る")}
                  onClick={() => setOpenCard(b.name)}
                >
                  ⋯
                </button>
              )}
            </div>
          </article>
          </Fragment>
        );
      })}
      {drinks.length > 1 && (
        <button type="button" className={`btn-ghost ${styles.clearAll}`} onClick={() => hide(drinks.map((d) => d.name), tr("{0}杯すべて", drinks.length))}>
          {tr("一覧をすべて消す")}
        </button>
      )}
    </section>
  );
}
