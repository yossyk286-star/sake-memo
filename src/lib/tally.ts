import { APP } from "./appeal";
import { today } from "./lastScan";
import type { TastingRecord } from "./types";

/** 記録を書かずに「＋1杯」だけ数えた分。この端末の中だけに2週間ぶん残す */
export type Tally = {
  id: string;
  date: string;
  shop: string;
  at: number;
  /** 量の計算に使う、そのお店で前に記録した1杯（種類・度数・量など） */
  like?: Partial<TastingRecord>;
};

const KEY = `${APP.id}:tally`;
const KEEP_DAYS = 14;

export function loadTallies(): Tally[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Tally[];
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

function save(all: Tally[]) {
  const from = Date.now() - KEEP_DAYS * 86400000;
  try {
    localStorage.setItem(KEY, JSON.stringify(all.filter((t) => t.at >= from)));
  } catch {}
}

export function todayTallies(): Tally[] {
  return loadTallies().filter((t) => t.date === today());
}

export function addTally(shop: string, like?: Partial<TastingRecord>): Tally[] {
  const t: Tally = { id: `t${Date.now().toString(36)}`, date: today(), shop, at: Date.now(), like };
  const all = [...loadTallies(), t];
  save(all);
  return all.filter((x) => x.date === today());
}

/** そのお店で最後に数えた1杯を取り消す */
export function removeLastTally(shop: string): Tally[] {
  const all = loadTallies();
  const i = all.map((t) => t.date === today() && t.shop === shop).lastIndexOf(true);
  if (i >= 0) all.splice(i, 1);
  save(all);
  return all.filter((x) => x.date === today());
}
