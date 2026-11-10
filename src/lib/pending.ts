import { getKV, setKV, deleteKV } from "./db";

/**
 * 電波がなくて読み取れなかったメニュー・ラベルの写真。端末に取っておき、電波が戻ったら読み取る。
 * drink＝お酒のメニュー・ラベル（調べる）、food＝料理のメニュー（料理から選ぶ）
 */
export type PendingKind = "drink" | "food";
const key = (kind: PendingKind) => `pending-${kind}`;

/** 電波がないときの失敗。ふつうの失敗と分けて、写真を取っておくのに使う */
export class OfflineError extends Error {
  constructor() {
    super("オフラインのため調べられません。電波のあるところでもう一度お試しください");
  }
}

/** オフラインなら OfflineError、つながらなかったとき（fetch 自体の失敗）も OfflineError にする */
export async function fetchOnline(input: string, init: RequestInit) {
  if (!navigator.onLine) throw new OfflineError();
  try {
    return await fetch(input, init);
  } catch {
    throw new OfflineError();
  }
}

export async function loadPending(kind: PendingKind): Promise<Blob[]> {
  return (await getKV<Blob[]>(key(kind)).catch(() => undefined)) ?? [];
}

export async function addPending(kind: PendingKind, photos: Blob[]) {
  const now = await loadPending(kind);
  // 取っておくのは10枚まで（容量を使いすぎないように）
  const next = [...now, ...photos].slice(-10);
  await setKV(key(kind), next);
  return next;
}

export async function setPending(kind: PendingKind, photos: Blob[]) {
  if (photos.length === 0) await deleteKV(key(kind));
  else await setKV(key(kind), photos);
}
