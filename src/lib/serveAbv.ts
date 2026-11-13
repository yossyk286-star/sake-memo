import type { Kind } from "./types";

/**
 * 飲み方ごとのおおよその度数。割る飲み方は目安の割合（お酒:割るもの）で計算する。
 * ratio が空なら割らない飲み方（ストレート・ロック・燗など）。わからない飲み方は null
 */
export function serveAbv(
  abv: number,
  serve: string,
  kind: Kind | null,
): { abv: number; ratio: string } | null {
  const s = serve.normalize("NFKC");
  const shochu = kind === "焼酎";
  const mix = (a: number, b: number) => ({ abv: (abv * a) / (a + b), ratio: `${a}:${b}` });
  if (/ハイボール|ソーダ|炭酸|トニック|ジンジャー/.test(s)) return mix(1, 3);
  if (/トワイスアップ/.test(s)) return mix(1, 1);
  if (/水割り/.test(s)) return shochu ? mix(6, 4) : mix(1, 2.5);
  if (/お湯割り/.test(s)) return shochu ? mix(6, 4) : mix(1, 2);
  if (/ストレート|ニート|ロック|燗|冷|常温|ぬる|熱|そのまま/.test(s)) return { abv, ratio: "" };
  return null;
}

/** 度数の表示。10% 未満は小数1けた、それ以上は整数 */
export function abvRound(n: number) {
  return n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
}

/** ハイボールにできる強いお酒か（ウイスキー・焼酎・その他で 20% 以上） */
export function canHighball(abv: number | null, kind: Kind | null) {
  return abv != null && abv >= 20 && kind !== "日本酒" && kind !== "ワイン" && kind !== "ビール";
}
