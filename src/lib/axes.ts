import type { TastingRecord } from "./types";

/** 五角形のグラフの軸。総合はグラフに入れず、上に数字で出す。古い記録には香り・キレがないので未入力として扱う */
export const TASTE_AXES: [string, (r: TastingRecord) => number | null | undefined][] = [
  ["甘さ", (r) => r.sweetness],
  ["酸味", (r) => r.acidity],
  ["コク", (r) => r.body],
  ["香り", (r) => r.aroma],
  ["キレ", (r) => r.finish],
];
