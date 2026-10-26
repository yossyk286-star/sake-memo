import { findCocktail } from "./cocktails";
import { KINDS } from "./glossary";
import type { Kind } from "./types";

/** 絞り込みで使うジャンル。種類に、その他から分けたカクテルを足したもの */
export type Genre = Kind | "カクテル";
export const GENRES: Genre[] = [
  ...KINDS.filter((k) => k !== "その他"),
  "カクテル",
  "その他",
];

/** その他のうち、カクテルとして分けるタイプ */
const COCKTAIL_STYLES = new Set(["カクテル", "サワー", "リキュール"]);

/** 種類が「その他」か未入力でも、カクテルのタイプや名前ならカクテルにする */
export function genreOf(d: {
  kind: Kind | null;
  style: string | null;
  name: string;
}): Genre | null {
  if (d.kind && d.kind !== "その他") return d.kind;
  if (d.style && COCKTAIL_STYLES.has(d.style)) return "カクテル";
  const c = d.name ? findCocktail(d.name) : null;
  if (c && c.style !== "梅酒") return "カクテル";
  return d.kind;
}

export function genreColor(g: Genre | null) {
  if (g === "カクテル") return "var(--k-cocktail)";
  return g ? `var(--k-${KIND_VAR[g]})` : "var(--muted)";
}

const KIND_VAR: Record<Kind, string> = {
  日本酒: "sake",
  ワイン: "wine",
  ビール: "beer",
  ウイスキー: "whisky",
  焼酎: "shochu",
  その他: "other",
};

/** 並び替え。甘さは 1=辛口〜5=甘口 */
export type SortKey =
  | "default"
  | "sweet"
  | "dry"
  | "abvLow"
  | "abvHigh"
  | "rating";
export const SORT_LABELS: Record<SortKey, string> = {
  default: "",
  sweet: "甘口から",
  dry: "辛口から",
  abvLow: "度数が低い順",
  abvHigh: "度数が高い順",
  rating: "評価が高い順",
};

type Sortable = {
  sweetness: number | null;
  abv: number | null;
  rating?: number | null;
};

/** 並び替えた新しい配列を返す。値がないものは後ろ（元の順のまま） */
export function sortBy<T>(
  items: T[],
  key: SortKey,
  get: (t: T) => Sortable,
): T[] {
  if (key === "default") return items;
  const value = (t: T): number | null => {
    const s = get(t);
    switch (key) {
      case "sweet":
        return s.sweetness;
      case "dry":
        return s.sweetness == null ? null : -s.sweetness;
      case "abvLow":
        return s.abv == null ? null : -s.abv;
      case "abvHigh":
        return s.abv;
      case "rating":
        return s.rating ?? null;
    }
  };
  return items
    .map((t, i) => ({ t, i, v: value(t) }))
    .sort(
      (a, b) =>
        (a.v == null ? 1 : 0) - (b.v == null ? 1 : 0) ||
        (b.v ?? 0) - (a.v ?? 0) ||
        a.i - b.i,
    )
    .map((x) => x.t);
}
