import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ScannedDrink } from "./menuScan";
import { loadMyTerms, saveMyTerms, type MyTerm } from "./myTerms";
import { photosOf } from "./photo";
import { exportSaved, importSaved } from "./savedLookups";
import { loadPrefs, savePrefs } from "./prefs";
import type { Bottle, TastingRecord } from "./types";

/** メニューで見て「次に試したい」と印を付けたお酒 */
export type WishDrink = ScannedDrink & { id: string; savedAt: number };

// 保存処理はこのファイルに集約する。将来 DB 同期に移すときはここだけ差し替える。

interface SakeDB extends DBSchema {
  records: {
    key: string;
    value: TastingRecord;
    indexes: { byDate: string };
  };
  wishes: {
    key: string;
    value: WishDrink;
  };
  bottles: {
    key: string;
    value: Bottle;
  };
}

let dbPromise: Promise<IDBPDatabase<SakeDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SakeDB>("sake-memo", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore("records", { keyPath: "id" });
          store.createIndex("byDate", "date");
          db.createObjectStore("wishes", { keyPath: "id" });
        }
        if (oldVersion < 2) db.createObjectStore("bottles", { keyPath: "id" });
      },
    });
    // ブラウザに「消さないで」と依頼する（対応ブラウザのみ）
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbPromise;
}

/** 新しい順（日付 → 作成時刻） */
export async function listRecords(): Promise<TastingRecord[]> {
  const all = await (await getDB()).getAll("records");
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function getRecord(id: string) {
  return (await getDB()).get("records", id);
}

export async function putRecord(record: TastingRecord) {
  await (await getDB()).put("records", record);
}

export async function deleteRecord(id: string) {
  await (await getDB()).delete("records", id);
}

/** 気になるお酒。新しく印を付けた順 */
export async function listWishes(): Promise<WishDrink[]> {
  const all = await (await getDB()).getAll("wishes");
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getWish(id: string) {
  return (await getDB()).get("wishes", id);
}

export async function putWish(wish: WishDrink) {
  await (await getDB()).put("wishes", wish);
}

export async function deleteWish(id: string) {
  await (await getDB()).delete("wishes", id);
}

/** 家のお酒。飲みかけを先に、新しく買った順 */
export async function listBottles(): Promise<Bottle[]> {
  const all = await (await getDB()).getAll("bottles");
  return all.sort((a, b) => Number(a.finished) - Number(b.finished) || b.createdAt - a.createdAt);
}

export async function getBottle(id: string) {
  return (await getDB()).get("bottles", id);
}

export async function putBottle(bottle: Bottle) {
  await (await getDB()).put("bottles", bottle);
}

export async function deleteBottle(id: string) {
  await (await getDB()).delete("bottles", id);
}

// --- 書き出し / 読み込み（バックアップ用） ---

/** 書き出しファイルの記録。写真は data URL。version 1 までは photo に1枚だけ */
type ExportedRecord = Omit<TastingRecord, "photo" | "photos"> & { photos?: string[]; photo?: string | null };

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportJSON(): Promise<string> {
  const records = await listRecords();
  const out: ExportedRecord[] = await Promise.all(
    records.map(async ({ photo: _old, ...r }) => ({
      ...r,
      photos: await Promise.all(photosOf({ ...r, photo: _old }).map(blobToDataURL)),
    })),
  );
  return JSON.stringify({ app: "sake-memo", version: 2, records: out, wishes: await listWishes(), bottles: await listBottles(), prefs: loadPrefs(), myTerms: loadMyTerms(), lookups: exportSaved() });
}

/** 同じ id の記録は上書きする。読み込んだ件数を返す */
export async function importJSON(text: string): Promise<number> {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (data?.app !== "sake-memo" || !Array.isArray(data.records)) {
    throw new Error("さけメモの書き出しファイルではありません");
  }
  const db = await getDB();
  // 写真の変換を先に済ませる（トランザクションの途中で待つと閉じてしまうため）
  const records = await Promise.all(
    (data.records as ExportedRecord[]).map(async ({ photo, photos, ...r }) => ({
      ...r,
      photos: await Promise.all((photos ?? (photo ? [photo] : [])).map(async (u) => (await fetch(u)).blob())),
    })),
  );
  const tx = db.transaction(["records", "wishes", "bottles"], "readwrite");
  for (const r of records) await tx.objectStore("records").put(r);
  for (const w of (data.wishes ?? []) as WishDrink[]) await tx.objectStore("wishes").put(w);
  for (const b of (data.bottles ?? []) as Bottle[]) await tx.objectStore("bottles").put(b);
  await tx.done;
  if (data.prefs) savePrefs({ ...loadPrefs(), ...data.prefs });
  importSaved(data.lookups);
  if (Array.isArray(data.myTerms)) {
    const mine = loadMyTerms();
    const added = (data.myTerms as MyTerm[]).filter((t) => !mine.some((m) => m.term === t.term));
    saveMyTerms([...mine, ...added]);
  }
  return data.records.length;
}
