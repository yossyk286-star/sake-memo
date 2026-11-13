import { tr } from "./i18n";
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
  // ratio は「お酒1:ソーダ3」のように何で割るかまで書く（何を割るのか迷わないように）
  const mix = (a: number, b: number, with_: string) => ({
    abv: (abv * a) / (a + b),
    ratio: tr("お酒{0}:{1}{2}", a, tr(with_), b),
  });
  if (/トニック/.test(s)) return mix(1, 3, "トニック");
  if (/ジンジャー/.test(s)) return mix(1, 3, "ジンジャーエール");
  if (/ハイボール|ソーダ|炭酸/.test(s)) return mix(1, 3, "ソーダ");
  if (/トワイスアップ/.test(s)) return mix(1, 1, "水");
  if (/水割り/.test(s)) return shochu ? mix(6, 4, "水") : mix(1, 2.5, "水");
  if (/お湯割り/.test(s)) return shochu ? mix(6, 4, "お湯") : mix(1, 2, "お湯");
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
