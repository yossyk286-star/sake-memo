import { today } from "./lastScan";

/** 調べる画面で入れた「今日のお店」の名前。記録するときの店名に先に入れる。次の日には使わない */
const KEY = "sake-memo:shop-today";

export function loadShopToday(): string {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { date: string; name: string } | null;
    return v?.date === today() ? v.name : "";
  } catch {
    return "";
  }
}

/** お店の名前が変わった合図（調べる画面で「前回のメニュー」を出し直す） */
export const SHOP_TODAY_EVENT = "sake-memo:shop-today";

export function saveShopToday(name: string) {
  try {
    if (name.trim()) localStorage.setItem(KEY, JSON.stringify({ date: today(), name: name.trim() }));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(SHOP_TODAY_EVENT));
}
