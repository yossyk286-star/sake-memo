export type { ScannedDrink, DrinkTaste, MenuScanResult, PairingResult, DishIdeas, TermLookup } from "./schemas";
import type { ScannedDrink } from "./schemas";
import type { Kind, RecordDraft } from "./types";
import { STYLES_BY_KIND } from "./glossary";

/** 読み取ったタイプが、その種類で選べるものならそのまま、違えば null */
function styleOf(kind: Kind | null, style: string) {
  if (!kind || !style) return null;
  return STYLES_BY_KIND[kind].includes(style) ? style : null;
}

/** 読み取ったお酒を記録フォームの値に変換する */
export function drinkToDraft(
  d: ScannedDrink,
): Pick<RecordDraft, "name" | "maker" | "origin" | "kind" | "style" | "serve" | "menuNote" | "abv"> {
  return {
    name: d.name,
    maker: d.maker,
    origin: d.origin,
    kind: d.kind,
    style: styleOf(d.kind, d.style),
    serve: d.recommendedServe || null,
    menuNote: d.menuNote,
    // 前の版で調べた結果には度数がない
    abv: d.abv ?? null,
  };
}
