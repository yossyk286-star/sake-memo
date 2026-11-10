import { collectStamps, REGIONS } from "./origins";
import { groupByShop, isHome } from "./shops";
import type { WishDrink } from "./db";
import type { Kind, TastingRecord } from "./types";

/** アプリごとに違うところ（名前・称号・しるし・友だちに送るお酒）をここにまとめる。ほかの部品は両アプリで同じ */
export const APP = { id: "sake-memo", name: "さけメモ", url: "https://sake-memo.vercel.app" };

/** 好み画面や相性の文で使う呼び名 */
export const WORDS = {
  /** 「★の高かった◯◯」 */
  drink: "お酒",
  /** 数えるときの単位 */
  cup: "杯",
  place: "産地",
};

/** 記録の数で上がる称号。at 杯目でその称号になる */
export const TITLES = [
  { at: 1, name: "のみはじめ" },
  { at: 10, name: "お酒ずき" },
  { at: 25, name: "お酒通" },
  { at: 50, name: "利き酒の達人" },
  { at: 100, name: "酒仙" },
];

export type Badge = { id: string; icon: string; label: string; how: string; done: boolean };

const OVERSEAS = new Set(REGIONS.find((r) => r.region === "海外")?.places.map((p) => p.name) ?? []);
const KINDS: [Kind, string][] = [
  ["日本酒", "🍶"],
  ["ワイン", "🍷"],
  ["ビール", "🍺"],
  ["ウイスキー", "🥃"],
  ["焼酎", "🫗"],
];

/** あつめるしるし（24個）。done は記録から決める */
export function badgesOf(records: TastingRecord[]): Badge[] {
  const n = records.length;
  const places = collectStamps(records).stamps;
  const overseas = [...places.keys()].filter((p) => OVERSEAS.has(p)).length;
  const kinds = new Set(records.map((r) => r.kind));
  const shops = groupByShop(records).length;
  const perDay = new Map<string, number>();
  for (const r of records) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
  const friday = records.some((r) => {
    const [y, m, d] = r.date.split("-").map(Number);
    return new Date(y, m - 1, d).getDay() === 5;
  });
  const b = (id: string, icon: string, label: string, how: string, done: boolean): Badge => ({ id, icon, label, how, done });
  return [
    b("n1", "🌱", "1杯目", "はじめて記録する", n >= 1),
    b("n10", "🔟", "10杯目", "10杯記録する", n >= 10),
    b("n25", "🎖️", "25杯目", "25杯記録する", n >= 25),
    b("n50", "🏅", "50杯目", "50杯記録する", n >= 50),
    b("n100", "💯", "100杯目", "100杯記録する", n >= 100),
    b("p3", "📍", "産地3か所", "3か所の産地を飲む", places.size >= 3),
    b("p5", "🗾", "産地5か所", "5か所の産地を飲む", places.size >= 5),
    b("p10", "🧭", "産地10か所", "10か所の産地を飲む", places.size >= 10),
    b("p20", "🚄", "産地20か所", "20か所の産地を飲む", places.size >= 20),
    b("abroad", "🌏", "海外3か国", "海外のお酒を3か国ぶん飲む", overseas >= 3),
    ...KINDS.map(([k, icon]) => b(`k-${k}`, icon, k, `${k}を記録する`, kinds.has(k))),
    b("k-all", "🌈", "5種類ぜんぶ", "日本酒・ワイン・ビール・ウイスキー・焼酎を記録する", KINDS.every(([k]) => kinds.has(k))),
    b("star5", "⭐", "★5の1杯", "★5をつける", records.some((r) => r.overall >= 5)),
    b("shop3", "🏮", "お店3軒", "3軒のお店で記録する", shops >= 3),
    b("shop10", "🍢", "お店10軒", "10軒のお店で記録する", shops >= 10),
    b("home", "🏠", "家飲み", "家で飲んで記録する", records.some((r) => isHome(r.shop))),
    b("photo", "📷", "写真5枚", "写真つきの記録を5つ", records.filter((r) => r.photos?.length || r.photo).length >= 5),
    b("friday", "🌙", "金曜の夜", "金曜日に記録する", friday),
    b("three", "🍻", "1日に3杯", "同じ日に3杯記録する", [...perDay.values()].some((c) => c >= 3)),
    b("food", "🍽️", "料理と5回", "合わせた料理を5回書く", records.filter((r) => r.pairing.trim()).length >= 5),
  ];
}

/** 飲んだ産地（スタンプ帳と同じ数えかた） */
export function placesOf(records: TastingRecord[]) {
  return collectStamps(records).stamps;
}

/** 友だちに送る「★の高かったお酒」。名前・種類・タイプ・産地と、その記録の味（甘さ・酸味・コク・香り）だけ。メモやお店は送らない */
export type Fav = [name: string, kind: string, style: string, origin: string, taste: number[]];

export function favOf(r: TastingRecord): Fav | null {
  const name = r.name || r.maker;
  const taste = [r.sweetness, r.acidity, r.body, r.aroma].map((v) => v ?? 3);
  return name ? [name, r.kind ?? "", r.style ?? "", r.origin, taste] : null;
}

export function favView([name, kind, style, origin]: Fav) {
  return { title: name, sub: [kind, style, origin].filter(Boolean) };
}

const KIND_NAMES: Kind[] = ["日本酒", "ワイン", "ビール", "ウイスキー", "焼酎", "その他"];

/** 送られてきたお酒を「気になる」に入れる形にする */
export function favToWish([name, kind, style, origin, taste]: Fav, from: string): WishDrink {
  const [sweetness, acidity, body, aroma] = taste;
  return {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    name,
    kind: KIND_NAMES.find((k) => k === kind) ?? null,
    style,
    maker: "",
    origin,
    menuNote: "",
    explanation: from,
    recommendedServe: "",
    recommendation: "",
    pairing: "",
    abv: null,
    abvStated: false,
    taste: { sweetness, acidity, body, aroma },
    serveNotes: [],
  };
}
