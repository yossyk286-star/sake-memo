import { APP } from "./appeal";
import { today } from "./lastScan";
import type { TastingRecord } from "./types";

/** 記録を書かずに数えた1杯。この端末の中だけに2週間ぶん残す */
export type Tally = {
  id: string;
  date: string;
  shop: string;
  at: number;
  /** 「生ビール」などの飲み物の名前。古い「＋1杯」は名前なし */
  name?: string;
  /** 記録したお酒の「おかわり」のときは、その記録 */
  recId?: string;
  /** 量の計算に使う、種類・度数・量など */
  like?: Partial<TastingRecord>;
};

const KEY = `${APP.id}:tally`;
const DRINKS_KEY = `${APP.id}:quick-drinks`;
const PRICES_KEY = `${APP.id}:quick-prices`;
const KEEP_DAYS = 14;

function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export function loadTallies(): Tally[] {
  const all = read<Tally[]>(KEY, []);
  return Array.isArray(all) ? all : [];
}

function save(all: Tally[]) {
  const from = Date.now() - KEEP_DAYS * 86400000;
  write(
    KEY,
    all.filter((t) => t.at >= from),
  );
  return all.filter((x) => x.date === today());
}

export function todayTallies(): Tally[] {
  return loadTallies().filter((t) => t.date === today());
}

export function addTally(shop: string, more: Pick<Tally, "name" | "recId" | "like"> = {}): Tally[] {
  const t: Tally = { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, date: today(), shop, at: Date.now(), ...more };
  return save([...loadTallies(), t]);
}

/** そのお店のその飲み物で、最後に数えた1杯を取り消す */
export function removeLastTally(shop: string, name?: string): Tally[] {
  const all = loadTallies();
  const i = all.map((t) => t.date === today() && t.shop === shop && t.name === name).lastIndexOf(true);
  if (i >= 0) all.splice(i, 1);
  return save(all);
}

export function removeTally(id: string): Tally[] {
  return save(loadTallies().filter((t) => t.id !== id));
}

/** 自分で足した飲み物（「梅酒ロック」など） */
export function loadCustomDrinks(): { name: string; like: Partial<TastingRecord> }[] {
  return read(DRINKS_KEY, []);
}
export function addCustomDrink(name: string, like: Partial<TastingRecord>) {
  const list = loadCustomDrinks().filter((d) => d.name !== name);
  write(DRINKS_KEY, [...list, { name, like }].slice(-12));
}

/** お店ごとに覚えた1杯の値段 { お店: { 生ビール: 600 } } */
export function loadPrices(): Record<string, Record<string, number>> {
  return read(PRICES_KEY, {});
}
export function savePrice(shop: string, name: string, price: number | null) {
  const all = loadPrices();
  const m = { ...(all[shop] ?? {}) };
  if (price) m[name] = price;
  else delete m[name];
  all[shop] = m;
  write(PRICES_KEY, all);
}

/** よく押した順（2週間ぶんの数） */
export function usageOf(): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of loadTallies()) if (t.name && !t.recId) m.set(t.name, (m.get(t.name) ?? 0) + 1);
  return m;
}
