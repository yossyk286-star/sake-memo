import { deleteKV, getKV, setKV } from "./db";
import type { RecordDraft } from "./types";

/** 書きかけの新しい記録。アプリを閉じたり別の画面に移ったりしても消えないよう、入力のたびに残す */
const KEY = "record-draft";
export type Stash = { draft: RecordDraft; savedAt: number };

/** 1週間より前の書きかけは出さない */
export async function loadStash(): Promise<Stash | null> {
  const s = await getKV<Stash>(KEY).catch(() => undefined);
  return s && Date.now() - s.savedAt < 7 * 24 * 60 * 60 * 1000 ? s : null;
}

export function saveStash(draft: RecordDraft) {
  return setKV(KEY, { draft, savedAt: Date.now() }).catch(() => {});
}

export function clearStash() {
  return deleteKV(KEY).catch(() => {});
}
