import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ScannedDrink } from "./menuScan";
import { loadPrefs, savePrefs } from "./prefs";
import type { TastingRecord } from "./types";

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
}

let dbPromise: Promise<IDBPDatabase<SakeDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SakeDB>("sake-memo", 1, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore("records", { keyPath: "id" });
          store.createIndex("byDate", "date");
          db.createObjectStore("wishes", { keyPath: "id" });
        }
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

// --- 書き出し / 読み込み（バックアップ用） ---

type ExportedRecord = Omit<TastingRecord, "photo"> & { photo: string | null };

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
    records.map(async (r) => ({ ...r, photo: r.photo ? await blobToDataURL(r.photo) : null })),
  );
  return JSON.stringify({ app: "sake-memo", version: 1, records: out, wishes: await listWishes(), prefs: loadPrefs() });
}

/** 同じ id の記録は上書きする。読み込んだ件数を返す */
export async function importJSON(text: string): Promise<number> {
  const data = JSON.parse(text);
  if (data?.app !== "sake-memo" || !Array.isArray(data.records)) {
    throw new Error("さけメモの書き出しファイルではありません");
  }
  const db = await getDB();
  // 写真の変換を先に済ませる（トランザクションの途中で待つと閉じてしまうため）
  const records = await Promise.all(
    (data.records as ExportedRecord[]).map(async (r) => ({
      ...r,
      photo: r.photo ? await (await fetch(r.photo)).blob() : null,
    })),
  );
  const tx = db.transaction(["records", "wishes"], "readwrite");
  for (const r of records) await tx.objectStore("records").put(r);
  for (const w of (data.wishes ?? []) as WishDrink[]) await tx.objectStore("wishes").put(w);
  await tx.done;
  if (data.prefs) savePrefs({ ...loadPrefs(), ...data.prefs });
  return data.records.length;
}
