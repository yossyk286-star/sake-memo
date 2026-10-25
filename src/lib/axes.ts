import type { TastingRecord } from "./types";

/** 六角形のグラフの軸。古い記録には香り・キレがないので未入力として扱う */
export const TASTE_AXES: [string, (r: TastingRecord) => number | null | undefined][] = [
  ["甘さ", (r) => r.sweetness],
  ["酸味", (r) => r.acidity],
  ["コク", (r) => r.body],
  ["香り", (r) => r.aroma],
  ["キレ", (r) => r.finish],
  ["総合", (r) => r.overall],
];
