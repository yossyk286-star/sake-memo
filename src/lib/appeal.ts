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
  { at: 1, name: "ひとくち目", quip: "ようこそ、こちらの世界へ" },
  { at: 3, name: "一献", quip: "まずは一杯、どうぞ" },
  { at: 5, name: "酒好き", quip: "メニューを見る目が変わってきた" },
  { at: 10, name: "呑み手", quip: "お店の人に顔を覚えられはじめる頃" },
  { at: 25, name: "酒通", quip: "ラベルの裏まで読むようになった" },
  { at: 50, name: "目利き", quip: "もう選ばれる側じゃなく、選ぶ側" },
  { at: 100, name: "酒仙", quip: "仙人の域。肝臓もいたわってね" },
  { at: 200, name: "酒聖", quip: "酒蔵から表彰状が届く…かもしれない" },
  { at: 365, name: "酒神", quip: "もはや拝まれる側" },
  { at: 500, name: "酒そのもの", quip: "もう、どっちが飲んでいるのかわからない" },
];

/** いちばん上まで来たときのひとこと（称号・しるし） */
export const TOP_LINES = { title: "もう教えることはありません。お水も飲んでね", badge: "極めた！まだ飲む？" };

/** icon は Medal に彫る絵の名前。「#10」のように # で始まるときは数字を彫る */
export type Badge = {
  id: string;
  icon: string;
  label: string;
  /** いまの段（0 銅〜4 ダイヤ）。まだ取っていなければ -1 */
  tier: number;
  done: boolean;
  /** 次の段に上がるには（いちばん上なら null）。how は「{0}杯記録する」のような文（{0} に need、{1} に arg が入る。tr で訳してから埋める） */
  next: { how: string; need: number; arg?: string; left: number; unit: string } | null;
};

/**
 * 同じ中身のしるしは1つにまとめ、続けるほど 銅→銀→金→プラチナ→ダイヤ と色が変わる。
 * steps は各段に届く数。how は段の数から「{0}杯記録する」のような文を選ぶ
 */
function tiered(id: string, icon: string, label: string, have: number, steps: number[], how: (n: number) => string, unit: string, arg?: string): Badge {
  const tier = steps.filter((s) => have >= s).length - 1;
  const need = steps[tier + 1];
  return {
    id,
    // 数字を彫るしるしは、いまの段（まだなら最初の段）の数を彫る
    icon: icon === "#" ? `#${steps[Math.max(0, tier)]}` : icon,
    label,
    tier,
    done: tier >= 0,
    next: need === undefined ? null : { how: how(need), need, arg, left: need - have, unit },
  };
}

const OVERSEAS = new Set(REGIONS.find((r) => r.region === "海外")?.places.map((p) => p.name) ?? []);
const KINDS: [Kind, string][] = [
  ["日本酒", "tokkuri"],
  ["ワイン", "wine"],
  ["ビール", "beer"],
  ["ウイスキー", "whisky"],
  ["焼酎", "choko"],
];

/** あつめるしるし。段は記録から決める */
export function badgesOf(records: TastingRecord[]): Badge[] {
  const n = records.length;
  const places = collectStamps(records).stamps;
  const overseas = [...places.keys()].filter((p) => OVERSEAS.has(p)).length;
  const shops = groupByShop(records).length;
  const perDay = new Map<string, number>();
  for (const r of records) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
  const kindCount = (k: Kind) => records.filter((r) => r.kind === k).length;
  const homeCount = records.filter((r) => isHome(r.shop)).length;
  const photoCount = records.filter((r) => r.photos?.length || r.photo).length;
  const fridays = new Set(
    records
      .filter((r) => {
        const [y, m, d] = r.date.split("-").map(Number);
        return new Date(y, m - 1, d).getDay() === 5;
      })
      .map((r) => r.date),
  ).size;
  return [
    tiered("cups", "#", "記録した杯数", n, [1, 10, 25, 50, 100], (x) => (x === 1 ? "はじめて記録する" : "{0}杯記録する"), "杯"),
    tiered("places", "pin", "産地", places.size, [3, 5, 10, 20, 30], () => "{0}か所の産地を飲む", "か所"),
    tiered("abroad", "globe", "海外のお酒", overseas, [1, 3, 5, 10, 15], () => "海外のお酒を{0}か国ぶん飲む", "か国"),
    ...KINDS.map(([k, icon]) => tiered(`k-${k}`, icon, k, kindCount(k), [1, 3, 5, 10, 20], (x) => (x === 1 ? "{1}を記録する" : "{1}を{0}杯"), "杯", k)),
    tiered(
      "k-all",
      "all",
      "5種類ぜんぶ",
      Math.min(...KINDS.map(([k]) => kindCount(k))),
      [1, 2, 3, 5, 10],
      (x) => (x === 1 ? "日本酒・ワイン・ビール・ウイスキー・焼酎を記録する" : "5種類それぞれ{0}杯"),
      "杯",
    ),
    tiered("star5", "star", "★5の1杯", records.filter((r) => r.overall >= 5).length, [1, 3, 5, 10, 20], (x) => (x === 1 ? "★5をつける" : "★5を{0}回"), "回"),
    tiered("shops", "store", "お店", shops, [3, 5, 10, 20, 30], () => "{0}軒のお店で記録する", "軒"),
    tiered("home", "home", "家飲み", homeCount, [1, 3, 5, 10, 20], (x) => (x === 1 ? "家で飲んで記録する" : "家で{0}杯"), "杯"),
    tiered("photo", "camera", "写真", photoCount, [5, 10, 20, 30, 50], () => "写真つきの記録を{0}つ", "つ"),
    tiered("friday", "moon", "金曜の夜", fridays, [1, 3, 5, 10, 20], (x) => (x === 1 ? "金曜日に記録する" : "金曜日{0}回"), "回"),
    tiered(
      "three",
      "cups",
      "1日に3杯",
      [...perDay.values()].filter((c) => c >= 3).length,
      [1, 3, 5, 10, 20],
      (x) => (x === 1 ? "同じ日に3杯記録する" : "3杯の日を{0}日"),
      "日",
    ),
    tiered("food", "food", "料理と合わせて", records.filter((r) => r.pairing.trim()).length, [5, 10, 20, 30, 50], () => "合わせた料理を{0}回書く", "回"),
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
