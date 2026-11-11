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
 * 前に見たときから新しく取れたしるしと称号。見たことにして覚える。
 * はじめて調べるときは、いま持っている分を黙って覚えるだけ（前から使っている人にまとめて出さない）
 */
export function newMilestones(records: TastingRecord[]): { badges: Badge[]; title: string | null } {
  const title = titleOf(records.length).name;
  const all = badgesOf(records);
  const done = all.filter((b) => b.done);
  // プラチナは後から増やしたので、印を分けて覚える（前から使っている人に、もうプラチナの分をまとめて出さない）
  const plat = all.filter((b) => b.done && b.plat?.done);
  const ids = [...done.map((b) => b.id), ...plat.map((b) => `plat:${b.id}`), ...(title ? [`title:${title}`] : [])];
  const seen = loadSeen();
  const platKnown = seen?.includes("plat") ?? false;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...(seen ?? []), ...ids, "plat"])]));
  } catch {
    // 覚えられない端末では、開くたびに出てしまうので何も出さない
    return { badges: [], title: null };
  }
  if (!seen) return { badges: [], title: null };
  const had = new Set(seen);
  return {
    badges: [...done.filter((b) => !had.has(b.id)), ...(platKnown ? plat.filter((b) => had.has(b.id) && !had.has(`plat:${b.id}`)) : [])],
    title: title && !had.has(`title:${title}`) ? title : null,
  };
}
