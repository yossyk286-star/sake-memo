/** 「15」「15.5%」「１５度」などから度数の数字を取り出す。読めなければ null */
export function parseAbv(text: string) {
  const m = text.normalize("NFKC").match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return n > 0 && n <= 100 ? n : null;
}

/** 表示用。推定のときは「約15%」、ラベルに書いてあれば「15%」 */
export function abvText(abv: number, stated = true) {
  const n = Math.round(abv * 10) / 10;
  return `${stated ? "" : "約"}${n}%`;
}
