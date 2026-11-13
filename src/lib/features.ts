"use client";

import { useSyncExternalStore } from "react";
import { FEATURES_KEY as KEY, FX } from "./featuresBoot";

/**
 * 自分で決められる細かい設定（設定画面の「動き」「表示」「記録」）。この端末の中だけに保存する。
 * 動きや表示を足したものは、どれも設定で止められるようにしている
 */
export type Features = {
  /** 詳細の色をラベル写真の色から取る */
  photoTint: boolean;
  /** 詳細の写真がスクロールでゆっくり動く */
  parallax: boolean;
  /** 総合の数字がくるっと回る */
  numRoll: boolean;
  /** 今日のお店を入れたら上に「店・今夜N杯」 */
  shopCapsule: boolean;
  /** 一覧が順にふわっと出る */
  listStagger: boolean;
  /** ★が左から順に灯る */
  starWave: boolean;
  /** スクロールで「記録する」が丸く縮む */
  fabShrink: boolean;
  /** 消した行が縮んで詰まる */
  rowCollapse: boolean;
  /** 空の必須欄が赤く揺れる */
  fieldShake: boolean;
  /** 好みの棒が左から伸びる */
  barGrow: boolean;
  /** くらべるの五角形が形を変える */
  radarMorph: boolean;
  /** 書体 */
  font: "gothic" | "round" | "mincho";
  /** 一覧の詰め具合 */
  density: "comfy" | "compact";
  /** 開いたときの画面 */
  start: "records" | "scan" | "last";
  /** 利き手。left は「記録する」「調べる」を左に寄せる */
  hand: "right" | "left";
  /** 1日の飲みすぎの目安（純アルコール g）。相棒が心配する */
  limit: 20 | 40 | 60;
  /** 点数の見せ方。中は ★0.5〜5 のまま */
  scale: "star5" | "ten" | "hundred";
  /** 記録の入力で隠す欄 */
  hidden: string[];
  /** ♥ また飲みたい */
  favorites: boolean;
  /** 同じお酒の「2回目」印 */
  repeatTag: boolean;
  /** 記録が少ないうちの好み診断 */
  tasteQuiz: boolean;
  /** 家のお酒の残りメーター */
  meter: boolean;
  /** 家で1回に注ぐ量（ml） */
  pour: number;
};

export const DEFAULT_FEATURES: Features = {
  photoTint: true,
  parallax: true,
  numRoll: true,
  shopCapsule: true,
  listStagger: true,
  starWave: true,
  fabShrink: true,
  rowCollapse: true,
  fieldShake: true,
  barGrow: true,
  radarMorph: true,
  font: "gothic",
  density: "comfy",
  start: "records",
  hand: "right",
  limit: 40,
  scale: "star5",
  hidden: [],
  favorites: true,
  repeatTag: true,
  tasteQuiz: true,
  meter: true,
  pour: 90,
};

const EVENT = "sake-memo:features";

let cache: Features | null = null;

/** 動きのスイッチは設定から外したので、前にオフにしていても全部オンに戻す */
const MOTION_ON = {
  listStagger: true,
  starWave: true,
  numRoll: true,
  barGrow: true,
  radarMorph: true,
  fabShrink: true,
  rowCollapse: true,
  fieldShake: true,
  parallax: true,
  photoTint: true,
  shopCapsule: true,
} satisfies Partial<Features>;

export function loadFeatures(): Features {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_FEATURES, ...JSON.parse(localStorage.getItem(KEY) ?? "{}"), ...MOTION_ON };
  } catch {
    cache = DEFAULT_FEATURES;
  }
  return cache!;
}

export function saveFeatures(next: Partial<Features>) {
  cache = { ...loadFeatures(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
  applyFeatures(cache);
  window.dispatchEvent(new Event(EVENT));
}


/** <html> に書体・詰め具合・利き手・動きの印を付ける（見た目は globals.css で決める） */
export function applyFeatures(f: Features) {
  const root = document.documentElement;
  root.dataset.font = f.font;
  root.dataset.density = f.density;
  root.dataset.hand = f.hand;
  root.dataset.fx = FX.filter((k) => f[k as keyof Features]).join(" ");
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** 設定を読む。サーバーで描くときは決まりの値 */
export function useFeatures(): Features {
  return useSyncExternalStore(subscribe, loadFeatures, () => DEFAULT_FEATURES);
}

/** 動きを減らす設定の人には、どの動きも出さない */
export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
