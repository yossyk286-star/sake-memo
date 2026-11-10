import { APP, placesOf } from "./appeal";
import { TASTE_AXES } from "./axes";
import { groupByShop } from "./shops";
import type { TastingRecord } from "./types";

export type Recap = {
  /** ふりかえる月（YYYY-MM） */
  month: string;
  monthNumber: number;
  count: number;
  /** その月にはじめて飲んだ産地 */
  newPlaces: string[];
  best: TastingRecord;
  /** 2回以上行ったお店のうち、いちばん多かったところ */
  shop: { name: string; times: number } | null;
  /** 平均がいちばん高かった味（3.5 以上のとき） */
  axis: string | null;
};

/** 先月の記録のまとめ。先月に記録がなければ null */
export function lastMonthRecap(records: TastingRecord[], now = new Date()): Recap | null {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const rs = records.filter((r) => r.date.startsWith(month));
  if (rs.length === 0) return null;
  const newPlaces = [...placesOf(records)]
    .filter(([, s]) => s.records.reduce((min, r) => (r.date < min ? r.date : min), "9999").startsWith(month))
    .map(([name]) => name);
  const best = [...rs].sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
  const shop = groupByShop(rs)
    .filter((s) => s.records.length >= 2)
    .sort((a, b) => b.records.length - a.records.length)[0];
  const axes = TASTE_AXES.map(([label, get]) => {
    const vs = rs.map(get).filter((v): v is number => typeof v === "number");
    return { label, avg: vs.length >= 2 ? vs.reduce((a, b) => a + b, 0) / vs.length : 0 };
  }).sort((a, b) => b.avg - a.avg);
  return {
    month,
    monthNumber: d.getMonth() + 1,
    count: rs.length,
    newPlaces,
    best,
    shop: shop ? { name: shop.name, times: shop.records.length } : null,
    axis: axes[0] && axes[0].avg >= 3.5 ? axes[0].label : null,
  };
}

const SEEN_KEY = `${APP.id}:recap-seen`;

export function recapSeen(month: string) {
  try {
    return localStorage.getItem(SEEN_KEY) === month;
  } catch {
    return true;
  }
}

export function markRecapSeen(month: string) {
  try {
    localStorage.setItem(SEEN_KEY, month);
  } catch {}
}
