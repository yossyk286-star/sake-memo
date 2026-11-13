import { APP, badgesOf, TITLES, type Badge } from "./appeal";
import type { TastingRecord } from "./types";

/** いまの称号と、次の称号まであと何杯か */
export function titleOf(count: number) {
  const at = TITLES.findLastIndex((t) => count >= t.at);
  const now = at >= 0 ? TITLES[at] : null;
  const next = TITLES[at + 1] ?? null;
  const from = now?.at ?? 0;
  return {
    /** 何段目か（0 から）。まだ記録がなければ -1 */
    tier: at,
    name: now?.name ?? null,
    /** その称号のひとこと */
    quip: now?.quip ?? null,
    next: next ? { name: next.name, left: next.at - count } : null,
    /** 次の称号までの進み具合（0〜1）。いちばん上なら 1 */
    progress: next ? (count - from) / (next.at - from) : 1,
  };
}

const SEEN_KEY = `${APP.id}:badges-seen`;

function loadSeen(): string[] | null {
  try {
    const s = localStorage.getItem(SEEN_KEY);
    return s ? (JSON.parse(s) as string[]) : null;
  } catch {
    return null;
  }
}

/**
 * 前に見たときから新しく取れたしるし（段が上がったものも）と称号。見たことにして覚える。
 * はじめて調べるときは、いま持っている分を黙って覚えるだけ（前から使っている人にまとめて出さない）
 */
export function newMilestones(records: TastingRecord[]): { badges: Badge[]; title: string | null } {
  const now = titleOf(records.length);
  const all = badgesOf(records).filter((b) => b.done);
  // しるしは段ごと（「places@2」＝産地の金）、称号は段の番号で覚える（言葉を変えても出し直さない）
  const ids = [...all.map((b) => `${b.id}@${b.tier}`), ...(now.tier >= 0 ? [`title@${now.tier}`] : [])];
  const seen = loadSeen();
  // 段ごとの覚え方は 2026-11 から。それより前に覚えた人は、いまの段を黙って覚える
  const known = seen?.includes("tiers") ?? false;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...(known ? seen ?? [] : []), ...ids, "tiers"])]));
  } catch {
    // 覚えられない端末では、開くたびに出てしまうので何も出さない
    return { badges: [], title: null };
  }
  if (!known) return { badges: [], title: null };
  const had = new Set(seen);
  return {
    badges: all.filter((b) => !had.has(`${b.id}@${b.tier}`)),
    title: now.name && !had.has(`title@${now.tier}`) ? now.name : null,
  };
}
