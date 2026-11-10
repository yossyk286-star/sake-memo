import { exportJSON } from "./db";

const LAST_KEY = "sake-memo:last-backup";
const SNOOZE_KEY = "sake-memo:backup-snooze";
const DAY = 24 * 60 * 60 * 1000;

/** 最後に書き出した時刻（ms）。まだなら null */
export function lastBackup(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** 何日前か（今日なら 0） */
export function daysSince(at: number) {
  return Math.floor((Date.now() - at) / DAY);
}

/**
 * 書き出す。共有シートが使えれば（iPhone など）そこから「ファイルに保存」や LINE・メールに送れるようにし、
 * 使えなければファイルとしてダウンロードする。やめたときは false
 */
export async function saveBackup(): Promise<boolean> {
  const name = `sake-memo-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([await exportJSON()], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return mark();
    } catch (err) {
      // 共有シートを閉じただけのときは何もしない。それ以外の失敗はダウンロードに切り替える
      if (err instanceof DOMException && err.name === "AbortError") return false;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  // すぐ片付けると iPhone で保存が始まらないことがあるので、少し待つ
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return mark();
}

function mark() {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {}
  return true;
}

/** 記録が5件以上あって、30日以上（または一度も）書き出していなければお知らせする。「あとで」から7日は出さない */
export function needsBackupNudge(recordCount: number) {
  if (recordCount < 5) return false;
  try {
    if (Number(localStorage.getItem(SNOOZE_KEY)) > Date.now()) return false;
  } catch {}
  const last = lastBackup();
  return last === null || daysSince(last) >= 30;
}

export function snoozeBackupNudge() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * DAY));
  } catch {}
}
