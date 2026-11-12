import { getKV, setKV } from "./db";
import { loadShopToday } from "./shopToday";
import { today } from "./lastScan";

/** 「あとで書く」箱に入れた写真（41）。お店では撮るだけにして、帰ってから記録する */
export type LaterItem = {
  id: string;
  photos: Blob[];
  /** 撮った日と、そのときの今日のお店 */
  date: string;
  shop: string;
  at: number;
};

const KEY = "later";
/** 箱の中身が変わった合図（ホームの件数を合わせる） */
export const LATER_EVENT = "sake-memo:later";

export async function loadLater(): Promise<LaterItem[]> {
  return ((await getKV<LaterItem[]>(KEY)) ?? []).sort((a, b) => b.at - a.at);
}

async function save(list: LaterItem[]) {
  await setKV(KEY, list);
  window.dispatchEvent(new Event(LATER_EVENT));
}

export async function addLater(photos: Blob[]) {
  const item: LaterItem = { id: crypto.randomUUID(), photos, date: today(), shop: loadShopToday(), at: Date.now() };
  await save([item, ...(await loadLater())]);
  return item;
}

export async function removeLater(id: string) {
  await save((await loadLater()).filter((x) => x.id !== id));
}

export async function getLater(id: string) {
  return (await loadLater()).find((x) => x.id === id);
}
