import { FLAVORS } from "./glossary";
import { today } from "./lastScan";
import type { Kind, TastingRecord } from "./types";

/** 今日から n 日前の「YYYY-MM-DD」 */
export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 日付の欄の横に出すボタン（61） */
export const DATE_CHIPS: [string, () => string][] = [
  ["今日", today],
  ["きのう", () => daysAgo(1)],
  ["おととい", () => daysAgo(2)],
];

/** 種類ごとの「感じた味」の言葉（2）。先頭ほどその種類でよく使う */
export const FLAVORS_BY_KIND: Record<Kind, string[]> = {
  日本酒: ["フルーティー", "華やか", "米の旨み", "メロン", "青りんご", "柑橘", "辛口", "乳酸・ヨーグルト", "バナナ", "ナッツ", "ミネラル", "スパイシー"],
  ワイン: ["ベリー", "柑橘", "青りんご", "フルーティー", "華やか", "バニラ・樽", "ハーブ", "スパイシー", "ミネラル", "土・きのこ", "蜂蜜", "ナッツ"],
  ビール: ["ホップ", "柑橘", "麦・パン", "苦味", "フルーティー", "カラメル", "ロースト", "バナナ", "スパイシー", "華やか"],
  ウイスキー: ["バニラ・樽", "スモーキー", "蜂蜜", "ドライフルーツ", "ナッツ", "チョコ", "柑橘", "スパイシー", "潮・海", "フルーティー"],
  焼酎: ["芋の甘み", "麦の香ばしさ", "米の旨み", "黒糖", "フルーティー", "華やか", "すっきり", "スモーキー", "土っぽさ", "ナッツ"],
  その他: ["フルーティー", "柑橘", "ベリー", "ハーブ", "スパイシー", "華やか", "苦味", "甘い", "バニラ・樽", "ミネラル"],
};

/** その種類の味の言葉を、自分がよく選んだ順に（同じ回数なら決まった順）。2回以上使った自分の言葉も足す */
export function flavorChoices(kind: Kind | null, past: TastingRecord[]) {
  const base = kind ? FLAVORS_BY_KIND[kind] : FLAVORS;
  const count = new Map<string, number>();
  for (const r of past) if (!kind || r.kind === kind) for (const f of r.flavors) count.set(f, (count.get(f) ?? 0) + 1);
  const mine = [...count].filter(([f, n]) => n >= 2 && !base.includes(f)).map(([f]) => f);
  const all = [...base, ...mine];
  return all.sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || all.indexOf(a) - all.indexOf(b));
}

/** 飲んだ量の選び方（32）。種類ごとの言い方と ml */
export const VOLUMES: Record<Kind, [string, number][]> = {
  日本酒: [["半合", 90], ["グラス", 120], ["1合", 180], ["2合", 360]],
  ワイン: [["グラス", 120], ["2杯", 240], ["ハーフ", 375], ["ボトル", 750]],
  ビール: [["グラス", 200], ["缶", 350], ["中ジョッキ", 400], ["ロング缶", 500], ["大ジョッキ", 700]],
  ウイスキー: [["シングル", 30], ["ダブル", 60]],
  焼酎: [["少なめ", 60], ["1杯", 90], ["濃いめ", 120], ["1合", 180]],
  その他: [["グラス", 120], ["缶", 350], ["ジョッキ", 400]],
};

/** 「1合（180ml）」のような量の名前。選択肢にない量は ml だけ */
export function volumeName(kind: Kind | null, ml: number) {
  const hit = kind ? VOLUMES[kind].find(([, v]) => v === ml) : undefined;
  return hit ? `${hit[0]}（${ml}ml）` : `${ml}ml`;
}

/** 種類ごとのよくある度数（54） */
export const ABV_PRESETS: Record<Kind, number[]> = {
  日本酒: [15, 16, 17],
  ワイン: [12, 13, 14],
  ビール: [5, 6, 7],
  ウイスキー: [40, 43, 46],
  焼酎: [20, 25],
  その他: [5, 7, 9],
};

/** よく入れる値段3つと、そのお店で前に入れた値段（54） */
export function priceChoices(past: TastingRecord[], shop: string) {
  const count = new Map<number, number>();
  for (const r of past) if (r.price) count.set(r.price, (count.get(r.price) ?? 0) + 1);
  const often = [...count].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([p]) => p);
  const here = shop.trim() ? past.find((r) => r.price && r.shop.trim() === shop.trim())?.price ?? null : null;
  const out = here ? [here, ...often.filter((p) => p !== here)] : often;
  return out.slice(0, 4).sort((a, b) => a - b);
}

/** これまでに付けたタグを、よく使う順に */
export function tagsUsed(records: TastingRecord[]) {
  const count = new Map<string, number>();
  for (const r of records) for (const t of r.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** 入力されたタグをととのえる（先頭の # と前後の空白を取る） */
export function cleanTag(t: string) {
  return t.replace(/^[#＃\s]+/, "").trim().slice(0, 20);
}
