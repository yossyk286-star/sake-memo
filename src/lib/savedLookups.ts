import type { ScannedDrink } from "./menuScan";

// 一度調べたお酒を端末に残しておき、同じ名前なら AI を呼ばずに出す
const KEY = "sake-memo:lookups";
// 端末の保存領域を使いすぎないよう、古いものから捨てる
const MAX = 300;

type Saved = { drink: ScannedDrink; at: number };

/** 比べるための表記ゆれをそろえる（全角半角・大文字小文字・空白・ひらがな/カタカナ） */
export function nameKey(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・･\-_'’]/g, "")
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function load(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** 調べた言葉か、お酒の名前で保存してあるものを返す */
export function findSaved(query: string) {
  return load()[nameKey(query)]?.drink ?? null;
}

/** 調べた結果を、お酒の名前と（あれば）調べた言葉の両方で引けるように保存する */
export function saveLookups(drinks: ScannedDrink[], query?: string) {
  const all = load();
  const at = Date.now();
  for (const d of drinks) all[nameKey(d.name)] = { drink: d, at };
  if (query && drinks.length === 1) all[nameKey(query)] = { drink: drinks[0], at };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}

/** 最近調べたお酒（名前が同じものは1つ） */
export function recentSaved(n: number) {
  const seen = new Set<string>();
  return Object.values(load())
    .sort((a, b) => b.at - a.at)
    .filter(({ drink }) => !seen.has(drink.name) && !!seen.add(drink.name))
    .slice(0, n)
    .map(({ drink }) => drink);
}

/** バックアップ用 */
export function exportSaved() {
  return load();
}

export function importSaved(data: unknown) {
  if (!data || typeof data !== "object") return;
  const merged = { ...(data as Record<string, Saved>), ...load() };
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {}
}
