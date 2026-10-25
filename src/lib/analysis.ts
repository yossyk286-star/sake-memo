import type { TastingRecord } from "./types";

export interface GroupAverage {
  label: string;
  average: number;
  count: number;
}

export interface TasteSummary {
  /** 総合の平均が一番高い「タイプ × 飲み方」。2件以上ある組み合わせのみ */
  bestCombo: GroupAverage | null;
  byKind: GroupAverage[];
  byStyle: GroupAverage[];
  byServe: GroupAverage[];
  byOrigin: GroupAverage[];
  topFlavors: { label: string; count: number }[];
}

const UNKNOWN = new Set(["不明", "その他", ""]);

/** key ごとに総合の平均を出す。不明・未入力は除外し、平均の高い順 */
function averageBy(records: TastingRecord[], key: (r: TastingRecord) => string | null, minCount = 1) {
  const groups = new Map<string, number[]>();
  for (const r of records) {
    const k = key(r)?.trim();
    if (!k || UNKNOWN.has(k)) continue;
    groups.set(k, [...(groups.get(k) ?? []), r.overall]);
  }
  return [...groups]
    .filter(([, scores]) => scores.length >= minCount)
    .map(([label, scores]) => ({
      label,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
}

/** 「日本酒・純米」のように種類とタイプをつなげる（タイプだけだと「スパークリング」などが種類をまたぐため） */
export function kindStyle(r: Pick<TastingRecord, "kind" | "style">) {
  return r.kind && r.style ? `${r.kind}・${r.style}` : null;
}

export function summarize(records: TastingRecord[]): TasteSummary {
  const combos = averageBy(
    records,
    (r) => {
      const ks = kindStyle(r);
      return ks && r.serve ? `${ks} × ${r.serve}` : null;
    },
    2,
  );

  const flavorCounts = new Map<string, number>();
  for (const r of records) for (const f of r.flavors) flavorCounts.set(f, (flavorCounts.get(f) ?? 0) + 1);

  return {
    bestCombo: combos[0] ?? null,
    byKind: averageBy(records, (r) => r.kind),
    byStyle: averageBy(records, kindStyle),
    byServe: averageBy(records, (r) => r.serve),
    byOrigin: averageBy(records, (r) => r.origin, 2),
    topFlavors: [...flavorCounts]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
