import type { TastingRecord } from "./types";

export type ShopSummary = {
  name: string;
  records: TastingRecord[];
  lastDate: string;
  /** その店でいちばん評価が高かった記録（同点なら新しいほう） */
  best: TastingRecord;
};

/** 行った店ごとにまとめる。最近行った順 */
export function groupByShop(records: TastingRecord[]): ShopSummary[] {
  const groups = new Map<string, TastingRecord[]>();
  for (const r of records) {
    const name = r.shop.trim();
    if (name) groups.set(name, [...(groups.get(name) ?? []), r]);
  }
  return [...groups]
    .map(([name, rs]) => {
      const sorted = [...rs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      const best = [...sorted].sort((a, b) => b.overall - a.overall)[0];
      return { name, records: sorted, lastDate: sorted[0].date, best };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}
