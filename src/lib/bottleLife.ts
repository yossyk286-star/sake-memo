import type { Bottle, Kind, TastingRecord } from "./types";

/** 瓶のよくある量（ml）。登録のときに選ばなかったら種類で決める */
export const BOTTLE_SIZES = [300, 500, 720, 750, 1800];
const USUAL_SIZE: Record<Kind, number> = { 日本酒: 720, ワイン: 750, ビール: 350, ウイスキー: 700, 焼酎: 720, その他: 500 };

export function sizeOf(b: Bottle) {
  return b.size ?? USUAL_SIZE[b.kind ?? "その他"];
}

/** 1回に注ぐ量。ウイスキーはショット、ビールは1本ずつ。ほかは設定の量 */
function pourOf(b: Bottle, pour: number) {
  if (b.kind === "ウイスキー") return 30;
  if (b.kind === "ビール") return sizeOf(b);
  return pour;
}

/** 残りの割合（0〜1）と、あと何杯か（45） */
export function remaining(b: Bottle, mine: TastingRecord[], pour: number) {
  const size = sizeOf(b);
  const p = pourOf(b, pour);
  // 自分で残りを決めていたら、そこから後の記録の分だけ減らす
  const start = b.leftSet ? size * b.leftSet.ratio : size;
  const used = b.leftSet ? Math.max(0, mine.length - b.leftSet.count) : mine.length;
  const left = Math.max(0, start - used * p);
  return { ratio: left / size, cups: Math.floor(left / p) };
}

/** 開けた日。決めていなければ、その瓶で最初に記録した日（46） */
export function openedOf(b: Bottle, mine: TastingRecord[]) {
  return b.openedAt ?? (mine.length ? mine.map((r) => r.date).sort()[0] : null);
}

/** 開けてから飲みきりたい日数の目安。目安のないもの（蒸留酒など）は null */
export function drinkWithin(b: Bottle): number | null {
  if (b.kind === "日本酒") return b.style === "生酒" ? 7 : b.style === "スパークリング" ? 2 : 30;
  if (b.kind === "ワイン") return b.style === "スパークリング" ? 2 : 5;
  if (b.kind === "その他" && b.style === "梅酒") return null;
  return null;
}

export function daysSinceDate(date: string, now = new Date()) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(y, m - 1, d).getTime();
  return Math.round(t / 86_400_000);
}
