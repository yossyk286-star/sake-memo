import type { ScannedDrink } from "./menuScan";

/** 最後に読み取ったメニュー（とラベルや名前で調べたお酒）。お店で確認だけして、あとから記録するときに撮り直さずに使う */
export type LastScan = {
  date: string;
  drinks: ScannedDrink[];
  /** この読み取り結果からすでに記録したお酒の名前 */
  recorded: string[];
};

const KEY = "sake-memo:last-scan";
/** 一覧が変わったときに流す合図（下のタブの件数を合わせる） */
export const LAST_SCAN_EVENT = "sake-memo:last-scan-changed";

export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今日の読み取り結果を返す。前の日のものは使わない */
export function loadLastScan(): LastScan | null {
  try {
    const scan = JSON.parse(localStorage.getItem(KEY) ?? "null") as LastScan | null;
    return scan?.date === today() ? scan : null;
  } catch {
    return null;
  }
}

function store(scan: LastScan) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scan));
  } catch {}
  window.dispatchEvent(new Event(LAST_SCAN_EVENT));
}

/** recorded はラベルや名前で1本足したときに、すでに記録した分を引き継ぐのに使う */
export function saveLastScan(drinks: ScannedDrink[], recorded: string[] = []) {
  store({ date: today(), drinks, recorded });
  saveShopMenu(drinks);
}

// --- お店ごとのメニュー（1）。今日のお店の名前を入れて読み取ったら、そのお店に結びつけて残す ---

const SHOP_MENUS = "sake-memo:shop-menus";
/** 残しておくお店の数（古いものから消す） */
const MAX_SHOPS = 30;
export type ShopMenu = { date: string; drinks: ScannedDrink[] };

function loadShopMenus(): Record<string, ShopMenu> {
  try {
    return JSON.parse(localStorage.getItem(SHOP_MENUS) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/** 今日のお店の名前（shopToday.ts と同じ所を読む。お互いを読み込み合わないようここで直接読む） */
function shopTodayName(): string {
  try {
    const v = JSON.parse(localStorage.getItem("sake-memo:shop-today") ?? "null") as { date: string; name: string } | null;
    return v?.date === today() ? v.name : "";
  } catch {
    return "";
  }
}

function saveShopMenu(drinks: ScannedDrink[]) {
  const shop = shopTodayName();
  if (!shop || drinks.length === 0) return;
  const all = loadShopMenus();
  all[shop] = { date: today(), drinks };
  const keep = Object.entries(all)
    .sort((a, b) => b[1].date.localeCompare(a[1].date))
    .slice(0, MAX_SHOPS);
  try {
    localStorage.setItem(SHOP_MENUS, JSON.stringify(Object.fromEntries(keep)));
  } catch {}
}

/** 前の日にこのお店で読み取ったメニュー。今日のものや、無ければ null */
export function loadShopMenu(shop: string): ShopMenu | null {
  const m = shop.trim() ? loadShopMenus()[shop.trim()] : undefined;
  return m && m.date !== today() && m.drinks.length > 0 ? m : null;
}

export function markRecorded(name: string) {
  const scan = loadLastScan();
  if (scan && !scan.recorded.includes(name)) store({ ...scan, recorded: [...scan.recorded, name] });
}
