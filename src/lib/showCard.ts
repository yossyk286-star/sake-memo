import { KINDS, SERVES_BY_KIND, STYLES_BY_KIND } from "./glossary";
import type { MyPrefs } from "./prefs";
import type { Kind, TastingRecord } from "./types";

/** 店員さんに見せる「こういうのが好きです」の中身 */
export interface ShowCard {
  /** 大きく出す味の言葉（辛口、香りが華やか など） */
  taste: string[];
  styles: string[];
  serves: string[];
  likes: string[];
  dislikes: string[];
  budget: number | null;
  /** おいしかったお酒（★4以上、評価の高い順） */
  favorites: TastingRecord[];
}

/** 気に入ったとみなす総合評価 */
const LIKED = 4;

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 多い順に並べて上から n 個 */
function topCounts(values: string[], n: number) {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v);
}

/** 1〜5 の寄り方を言葉にする。真ん中あたりは言わない */
type Words = [low: string, high: string];
function wordFor(value: number | null, [low, high]: Words) {
  if (value === null) return null;
  if (value <= 2.4) return low;
  if (value >= 3.6) return high;
  return null;
}

function sweetWords(kind: Kind | null): Words {
  if (kind === "ビール" || kind === "ウイスキー") return ["ドライ", "甘め"];
  return ["辛口", "甘口"];
}

/** 種類をしぼると、その種類の記録とタイプ・飲み方だけを使う。null なら全部 */
export function buildShowCard(records: TastingRecord[], prefs: MyPrefs, kind: Kind | null): ShowCard {
  const mine = kind ? records.filter((r) => r.kind === kind) : records;
  const liked = mine.filter((r) => r.overall >= LIKED);

  // 気に入った記録の平均。自分で登録した寄り方があればそちらを優先する
  function lean(pick: (r: TastingRecord) => number | null | undefined, pref: number | null = null) {
    if (pref !== null) return pref;
    const xs = liked.map(pick).filter((x): x is number => typeof x === "number");
    return xs.length > 0 ? average(xs) : null;
  }
  const taste = [
    wordFor(lean((r) => r.sweetness, prefs.sweetness), sweetWords(kind)),
    wordFor(lean((r) => r.body, prefs.body), ["軽くてすっきり", "コクがある"]),
    wordFor(lean((r) => r.aroma, prefs.aroma), ["香りは控えめ", "香りが華やか"]),
    wordFor(lean((r) => r.acidity), ["酸味はおだやか", "酸味がしっかり"]),
    wordFor(lean((r) => r.finish), ["後味がゆっくり", "キレがいい"]),
  ].filter((w): w is string => w !== null);

  const allowedStyles = kind ? STYLES_BY_KIND[kind] : null;
  const allowedServes = kind ? SERVES_BY_KIND[kind] : null;
  const styles = [
    ...new Set([
      ...prefs.styles.filter((s) => !allowedStyles || allowedStyles.includes(s)),
      ...topCounts(liked.map((r) => r.style ?? ""), 2),
    ]),
  ].slice(0, 3);
  const serves = [
    ...new Set([
      ...prefs.serves.filter((s) => !allowedServes || allowedServes.includes(s)),
      ...topCounts(liked.map((r) => r.serve ?? ""), 2),
    ]),
  ].slice(0, 3);
  const likes = [...new Set([...prefs.likes, ...topCounts(liked.flatMap((r) => r.flavors), 3)])]
    .filter((f) => !prefs.dislikes.includes(f))
    .slice(0, 5);

  const favorites = [...liked]
    .filter((r) => r.name.trim())
    .sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date))
    .slice(0, 3);

  return { taste, styles, serves, likes, dislikes: prefs.dislikes, budget: prefs.budget, favorites };
}

/** 選べる種類。好きな種類に登録したものと、気に入った記録が多い順 */
export function showKinds(records: TastingRecord[], prefs: MyPrefs): Kind[] {
  const fromRecords = topCounts(
    records.filter((r) => r.overall >= LIKED && r.kind).map((r) => r.kind!),
    KINDS.length,
  ) as Kind[];
  return [...new Set([...prefs.kinds.filter((k): k is Kind => KINDS.includes(k as Kind)), ...fromRecords])].filter(
    (k) => !prefs.avoidKinds.includes(k),
  );
}

export function isEmptyCard(c: ShowCard) {
  return (
    c.taste.length + c.styles.length + c.serves.length + c.likes.length + c.dislikes.length + c.favorites.length === 0 &&
    !c.budget
  );
}

/** 今日の気分（src/lib/moods.ts の MOODS）を、店員さんに伝わる言い方にする。ないものはそのまま出す */
const MOOD_PHRASES: Record<string, string> = {
  すっきり: "すっきりしたもの",
  香り華やか: "香りが華やか",
  しっかりコク: "コクがしっかり",
  "軽め・弱め": "軽めで度数低め",
  "強め・酔いたい": "強めのもの",
  飲みやすい: "飲みやすいもの",
  食事と一緒に: "食事に合うもの",
  シュワっと炭酸: "シュワっと炭酸",
  あったかいの: "温かいもの",
  キンキンに冷たく: "キンキンに冷えたもの",
};

export function moodPhrase(label: string) {
  return MOOD_PHRASES[label] ?? label;
}

const MOOD_KEY = "sake-memo:show-mood";

/** 選んだ今日の気分。同じ日のうちは開き直しても残す */
export function loadTodayMoods(today: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(MOOD_KEY) ?? "null");
    return saved?.date === today && Array.isArray(saved.moods) ? saved.moods : [];
  } catch {
    return [];
  }
}

export function saveTodayMoods(today: string, moods: string[]) {
  try {
    localStorage.setItem(MOOD_KEY, JSON.stringify({ date: today, moods }));
  } catch {}
}
