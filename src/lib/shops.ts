import type { TastingRecord } from "./types";

export type ShopSummary = {
  name: string;
  records: TastingRecord[];
  lastDate: string;
  /** その店でいちばん評価が高かった記録（同点なら新しいほう） */
  best: TastingRecord;
};

/** 家で飲んだ記録はお店ではないので、お店の一覧にも地図にも出さない */
const HOME_NAMES = new Set(["家", "自宅", "うち", "家飲み"]);

export function isHome(shop: string) {
  return HOME_NAMES.has(shop.trim());
}

/** 行った店ごとにまとめる（家は除く）。最近行った順 */
export function groupByShop(records: TastingRecord[]): ShopSummary[] {
  const groups = new Map<string, TastingRecord[]>();
  for (const r of records) {
    const name = r.shop.trim();
    if (name && !isHome(name)) groups.set(name, [...(groups.get(name) ?? []), r]);
  }
  return [...groups]
    .map(([name, rs]) => {
      const sorted = [...rs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      const best = [...sorted].sort((a, b) => b.overall - a.overall)[0];
      return { name, records: sorted, lastDate: sorted[0].date, best };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

/** 店名で Google マップを検索するリンク（API キー不要・無料）。家なら null */
export function mapsUrl(shop: string): string | null {
  const name = shop.trim();
  if (!name || isHome(name)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}
