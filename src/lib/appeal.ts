import { collectStamps, REGIONS } from "./origins";
import { groupByShop, isHome } from "./shops";
import type { WishDrink } from "./db";
import type { Kind, TastingRecord } from "./types";

/** アプリごとに違うところ（名前・称号・しるし・友だちに送るお酒）をここにまとめる。ほかの部品は両アプリで同じ */
export const APP = { id: "sake-memo", name: "さけメモ", url: "https://sake-memo.vercel.app", emblem: "tokkuri" };

/** 好み画面や相性の文で使う呼び名 */
export const WORDS = {
  /** 「★の高かった◯◯」 */
  drink: "お酒",
  /** 数えるときの単位 */
  cup: "杯",
  place: "産地",
  /** 産地を数える単位 */
  placeUnit: "か所",
};

/** 記録の数で上がる称号。at 杯目でその称号になる */
export const TITLES = [
  { at: 1, name: "のみはじめ" },
  { at: 10, name: "お酒ずき" },
  { at: 25, name: "お酒通" },
  { at: 50, name: "利き酒の達人" },
  { at: 100, name: "酒仙" },
];

/** icon は Medal に彫る絵の名前。「#10」のように # で始まるときは数字を彫る */
export type Badge = {
  id: string;
  icon: string;
  label: string;
  how: string;
  done: boolean;
  /** 取ったあと、もっと続けるとプラチナになる。left はあと何、unit はその単位 */
  plat?: { done: boolean; how: string; left: number; unit: string };
};

/** プラチナの目安。have が need に届いたらプラチナ */
const platOf = (have: number, need: number, how: string, unit: string) => ({ done: have >= need, how, left: Math.max(0, need - have), unit });

const OVERSEAS = new Set(REGIONS.find((r) => r.region === "海外")?.places.map((p) => p.name) ?? []);
const KINDS: [Kind, string][] = [
  ["日本酒", "tokkuri"],
  ["ワイン", "wine"],
  ["ビール", "beer"],
  ["ウイスキー", "whisky"],
  ["焼酎", "choko"],
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
  const b = (id: string, icon: string, label: string, how: string, done: boolean, plat?: Badge["plat"]): Badge => ({ id, icon, label, how, done, plat });
  const kindCount = (k: Kind) => records.filter((r) => r.kind === k).length;
  const homeCount = records.filter((r) => isHome(r.shop)).length;
  const fridays = new Set(
    records
      .filter((r) => {
        const [y, m, d] = r.date.split("-").map(Number);
        return new Date(y, m - 1, d).getDay() === 5;
      })
      .map((r) => r.date),
  ).size;
  return [
    b("n1", "sprout", "1杯目", "はじめて記録する", n >= 1),
    b("n10", "#10", "10杯目", "10杯記録する", n >= 10),
    b("n25", "#25", "25杯目", "25杯記録する", n >= 25),
    b("n50", "#50", "50杯目", "50杯記録する", n >= 50),
    b("n100", "#100", "100杯目", "100杯記録する", n >= 100),
    b("p3", "pin", "産地3か所", "3か所の産地を飲む", places.size >= 3),
    b("p5", "map", "産地5か所", "5か所の産地を飲む", places.size >= 5),
    b("p10", "compass", "産地10か所", "10か所の産地を飲む", places.size >= 10),
    b("p20", "train", "産地20か所", "20か所の産地を飲む", places.size >= 20),
    b("abroad", "globe", "海外3か国", "海外のお酒を3か国ぶん飲む", overseas >= 3, platOf(overseas, 10, "海外10か国", "か国")),
    ...KINDS.map(([k, icon]) => b(`k-${k}`, icon, k, `${k}を記録する`, kinds.has(k), platOf(kindCount(k), 10, `${k}を10杯`, "杯"))),
    b("k-all", "all", "5種類ぜんぶ", "日本酒・ワイン・ビール・ウイスキー・焼酎を記録する", KINDS.every(([k]) => kinds.has(k)), platOf(Math.min(...KINDS.map(([k]) => kindCount(k))), 5, "5種類それぞれ5杯", "杯")),
    b("star5", "star", "★5の1杯", "★5をつける", records.some((r) => r.overall >= 5), platOf(records.filter((r) => r.overall >= 5).length, 5, "★5を5回", "回")),
    b("shop3", "lantern", "お店3軒", "3軒のお店で記録する", shops >= 3),
    b("shop10", "store", "お店10軒", "10軒のお店で記録する", shops >= 10),
    b("home", "home", "家飲み", "家で飲んで記録する", homeCount > 0, platOf(homeCount, 10, "家で10杯", "杯")),
    b("photo", "camera", "写真5枚", "写真つきの記録を5つ", records.filter((r) => r.photos?.length || r.photo).length >= 5, platOf(records.filter((r) => r.photos?.length || r.photo).length, 20, "写真つきの記録を20", "つ")),
    b("friday", "moon", "金曜の夜", "金曜日に記録する", fridays > 0, platOf(fridays, 5, "金曜日5回", "回")),
    b("three", "cups", "1日に3杯", "同じ日に3杯記録する", [...perDay.values()].some((c) => c >= 3), platOf([...perDay.values()].filter((c) => c >= 3).length, 5, "3杯の日を5日", "日")),
    b("food", "food", "料理と5回", "合わせた料理を5回書く", records.filter((r) => r.pairing.trim()).length >= 5, platOf(records.filter((r) => r.pairing.trim()).length, 20, "料理を20回", "回")),
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

/** ホームの上に出す「いまの時間」のカード（さけは夜、まめは朝）。from〜to 時（to が24を超えると翌日） */
export const MOMENT = {
  from: 17,
  to: 27,
  title: "こんばんは。今夜の1杯、残しておこう",
  shoot: "メニューを撮る",
};

/**
 * 記録が少ないうちの好み診断（44）。答えは「わたしの好み」に入って、おすすめに使われる。
 * multi は複数選べる。value は MyPrefs に入れる値
 */
export type QuizQ =
  | { key: "kinds" | "avoidKinds" | "serves" | "likes"; q: string; multi: true; options: { label: string; value: string }[] }
  | { key: "sweetness" | "body" | "aroma" | "budget"; q: string; multi?: false; options: { label: string; value: number | null }[] };

export const TASTE_QUIZ: QuizQ[] = [
  {
    key: "kinds",
    q: "よく飲む・飲んでみたいお酒は？",
    multi: true,
    options: ["日本酒", "ワイン", "ビール", "ウイスキー", "焼酎", "その他"].map((v) => ({ label: v === "その他" ? "カクテル・梅酒など" : v, value: v })),
  },
  {
    key: "sweetness",
    q: "甘口と辛口、どっちが好き？",
    options: [
      { label: "辛口", value: 1 },
      { label: "やや辛口", value: 2 },
      { label: "どちらでも", value: null },
      { label: "やや甘口", value: 4 },
      { label: "甘口", value: 5 },
    ],
  },
  {
    key: "body",
    q: "軽いのと濃いの、どっちが好き？",
    options: [
      { label: "軽くすっきり", value: 1 },
      { label: "やや軽め", value: 2 },
      { label: "どちらでも", value: null },
      { label: "ややしっかり", value: 4 },
      { label: "濃くどっしり", value: 5 },
    ],
  },
  {
    key: "aroma",
    q: "香りは？",
    options: [
      { label: "控えめが好き", value: 2 },
      { label: "どちらでも", value: null },
      { label: "華やかなのが好き", value: 5 },
    ],
  },
  {
    key: "likes",
    q: "好きな味は？",
    multi: true,
    options: ["フルーティー", "華やか", "米の旨み", "柑橘", "ベリー", "辛口", "バニラ・樽", "スモーキー", "ホップ"].map((v) => ({ label: v, value: v })),
  },
  {
    key: "serves",
    q: "好きな飲み方は？",
    multi: true,
    options: ["冷酒", "熱燗", "よく冷やして", "ロック", "ハイボール", "ソーダ割り", "お湯割り"].map((v) => ({ label: v, value: v })),
  },
  {
    key: "avoidKinds",
    q: "苦手なお酒は？（なければそのまま次へ）",
    multi: true,
    options: ["日本酒", "ワイン", "ビール", "ウイスキー", "焼酎"].map((v) => ({ label: v, value: v })),
  },
  {
    key: "budget",
    q: "お店で1杯いくらくらいまで？",
    options: [
      { label: "〜600円", value: 600 },
      { label: "〜1,000円", value: 1000 },
      { label: "〜1,500円", value: 1500 },
      { label: "気にしない", value: null },
    ],
  },
];
