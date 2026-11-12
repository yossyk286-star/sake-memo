import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ScannedDrink } from "./menuScan";
import { loadMyTerms, saveMyTerms, type MyTerm } from "./myTerms";
import { photosOf } from "./photo";
import { exportSaved, importSaved } from "./savedLookups";
import { loadPrefs, savePrefs } from "./prefs";
import type { Bottle, TastingRecord } from "./types";

/** メニューで見て「次に試したい」と印を付けたお酒 */
/** shop：☆を付けたときの今日のお店（お店ごとにまとめて出す） */
export type WishDrink = ScannedDrink & { id: string; savedAt: number; shop?: string };

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
  /** 書きかけの記録や、電波がなくて読み取れなかった写真など、ちょっとした保存場所 */
  kv: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<SakeDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SakeDB>("sake-memo", 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore("records", { keyPath: "id" });
          store.createIndex("byDate", "date");
          db.createObjectStore("wishes", { keyPath: "id" });
        }
        if (oldVersion < 2) db.createObjectStore("bottles", { keyPath: "id" });
        if (oldVersion < 3) db.createObjectStore("kv");
      },
    });
    // ブラウザに「消さないで」と依頼する（対応ブラウザのみ）
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbPromise;
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await (await getDB()).get("kv", key)) as T | undefined;
}

export async function setKV(key: string, value: unknown) {
  await (await getDB()).put("kv", value, key);
}

export async function deleteKV(key: string) {
  await (await getDB()).delete("kv", key);
}

/** 新しい順（日付 → 作成時刻） */
/**
 * 最後に読んだ一覧を覚えておく。タブを行き来したとき、読み終わるのを待たずにすぐ描けるように
 * （描いたあとで読み直して新しい内容に置き換える）。書いたときは覚えた一覧も合わせて直す
 */
let recordsMemo: TastingRecord[] | null = null;
let wishesMemo: WishDrink[] | null = null;
let bottlesMemo: Bottle[] | null = null;
const byRecord = (a: TastingRecord, b: TastingRecord) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
const byWish = (a: WishDrink, b: WishDrink) => b.savedAt - a.savedAt;
const byBottle = (a: Bottle, b: Bottle) => Number(a.finished) - Number(b.finished) || b.createdAt - a.createdAt;
function upsert<T extends { id: string }>(list: T[] | null, item: T, sort: (a: T, b: T) => number) {
  return list ? [...list.filter((x) => x.id !== item.id), item].sort(sort) : null;
}

/** 前に読んだ記録の一覧（まだ読んでいなければ null） */
export const peekRecords = () => recordsMemo;
export const peekWishes = () => wishesMemo;
export const peekBottles = () => bottlesMemo;

export async function listRecords(): Promise<TastingRecord[]> {
  const all = await (await getDB()).getAll("records");
  recordsMemo = all.sort(byRecord);
  return [...recordsMemo];
}

export async function getRecord(id: string) {
  return (await getDB()).get("records", id);
}

export async function putRecord(record: TastingRecord) {
  await (await getDB()).put("records", record);
  recordsMemo = upsert(recordsMemo, record, byRecord);
}

export async function deleteRecord(id: string) {
  await (await getDB()).delete("records", id);
  recordsMemo = recordsMemo?.filter((r) => r.id !== id) ?? null;
}

/** 気になるお酒。新しく印を付けた順 */
export async function listWishes(): Promise<WishDrink[]> {
  const all = await (await getDB()).getAll("wishes");
  wishesMemo = all.sort(byWish);
  return [...wishesMemo];
}

export async function getWish(id: string) {
  return (await getDB()).get("wishes", id);
}

export async function putWish(wish: WishDrink) {
  await (await getDB()).put("wishes", wish);
  wishesMemo = upsert(wishesMemo, wish, byWish);
}

export async function deleteWish(id: string) {
  await (await getDB()).delete("wishes", id);
  wishesMemo = wishesMemo?.filter((w) => w.id !== id) ?? null;
}

/** 家のお酒。飲みかけを先に、新しく買った順 */
export async function listBottles(): Promise<Bottle[]> {
  const all = await (await getDB()).getAll("bottles");
  bottlesMemo = all.sort(byBottle);
  return [...bottlesMemo];
}

export async function getBottle(id: string) {
  return (await getDB()).get("bottles", id);
}

export async function putBottle(bottle: Bottle) {
  await (await getDB()).put("bottles", bottle);
  bottlesMemo = upsert(bottlesMemo, bottle, byBottle);
}

export async function deleteBottle(id: string) {
  await (await getDB()).delete("bottles", id);
  bottlesMemo = bottlesMemo?.filter((b) => b.id !== id) ?? null;
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
  // 人から受け取ったファイルかもしれないので、形の違う記録は飛ばし、写真は中に埋め込まれた画像（data:image）だけ読む
  // （よそのサイトの URL を書かれても取りに行かない）
  const records = await Promise.all(
    (data.records as ExportedRecord[]).filter((r) => isEntry(r) && typeof r.date === "string").map(async ({ photo, photos, ...r }) => ({
      ...r,
      photos: await Promise.all(
        (Array.isArray(photos) ? photos : photo ? [photo] : []).filter(isImageData).map(async (u) => (await fetch(u)).blob()),
      ),
    })),
  );
  const tx = db.transaction(["records", "wishes", "bottles"], "readwrite");
  for (const r of records) await tx.objectStore("records").put(r);
  for (const w of (Array.isArray(data.wishes) ? (data.wishes as WishDrink[]).filter(isEntry) : [])) await tx.objectStore("wishes").put(w);
  for (const b of (Array.isArray(data.bottles) ? (data.bottles as Bottle[]).filter(isEntry) : [])) await tx.objectStore("bottles").put(b);
  await tx.done;
  recordsMemo = wishesMemo = bottlesMemo = null;
  if (data.prefs) savePrefs({ ...loadPrefs(), ...data.prefs });
  importSaved(data.lookups);
  if (Array.isArray(data.myTerms)) {
    const mine = loadMyTerms();
    const added = (data.myTerms as MyTerm[]).filter((t) => typeof t?.term === "string" && !mine.some((m) => m.term === t.term));
    saveMyTerms([...mine, ...added]);
  }
  return records.length;
}

/** 読み込むファイルの記録・気になる・家の分が、少なくとも id を持っているか */
function isEntry<T>(x: T): x is T {
  const o = x as Record<string, unknown> | null;
  return !!o && typeof o === "object" && typeof o.id === "string" && !!o.id;
}

/** 埋め込まれた画像（data:image/…;base64,…）だけ */
function isImageData(u: unknown): u is string {
  return typeof u === "string" && /^data:image\/(jpeg|png|webp|gif|heic|heif);base64,/.test(u);
}

/** 記録が外から変わった（消したあと「元に戻す」など）。一覧はこれで読み直す */
export const RECORDS_EVENT = "sake-memo:records";

/** 記録を消して、5秒だけ「元に戻す」を出す（50）。消す前の確認は呼ぶ側で済ませる */
export async function deleteWithUndo(record: TastingRecord) {
  await deleteRecord(record.id);
  const { toast } = await import("./toast");
  toast("削除しました", {
    ms: 5000,
    action: {
      label: "元に戻す",
      onClick: async () => {
        await putRecord(record);
        window.dispatchEvent(new Event(RECORDS_EVENT));
        toast("元に戻しました");
      },
    },
  });
}

/** 何件かまとめて消して、5秒だけ「元に戻す」を出す（57）。消す前の確認は呼ぶ側で済ませる */
export async function deleteManyWithUndo(records: TastingRecord[]) {
  for (const r of records) await deleteRecord(r.id);
  const { toast } = await import("./toast");
  const { tr } = await import("./i18n");
  toast(tr("{0}件を削除しました", records.length), {
    ms: 5000,
    action: {
      label: "元に戻す",
      onClick: async () => {
        for (const r of records) await putRecord(r);
        window.dispatchEvent(new Event(RECORDS_EVENT));
        toast("元に戻しました");
      },
    },
  });
}
