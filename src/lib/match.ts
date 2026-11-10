import { APP, favOf, type Fav } from "./appeal";
import { TASTE_AXES } from "./axes";
import type { TastingRecord } from "./types";

/** 友だちに送る好み。味の平均（軸の順、0.1 きざみ）と、★の高かったもの3つまで。メモ・お店・日付は入れない */
export type TasteCard = { t: (number | null)[]; f: Fav[] };

/** ★4以上の記録の味の平均。★4以上が3件に満たなければ全部の記録から */
export function tasteVector(records: TastingRecord[]): (number | null)[] {
  const liked = records.filter((r) => r.overall >= 4);
  const src = liked.length >= 3 ? liked : records;
  return TASTE_AXES.map(([, get]) => {
    const vs = src.map(get).filter((v): v is number => typeof v === "number");
    return vs.length ? Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10 : null;
  });
}

export const hasTaste = (t: (number | null)[]) => t.filter((v) => v !== null).length >= 2;

export function myCard(records: TastingRecord[]): TasteCard {
  const seen = new Set<string>();
  const f: Fav[] = [];
  for (const r of [...records].filter((r) => r.overall >= 4).sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)) {
    const fav = favOf(r);
    if (!fav || seen.has(fav[0])) continue;
    seen.add(fav[0]);
    f.push(fav);
    if (f.length === 3) break;
  }
  return { t: tasteVector(records), f };
}

// URL に入れられる形（base64url）にする。日本語が入るので UTF-8 にしてから
function toB64(s: string) {
  const bin = String.fromCharCode(...new TextEncoder().encode(s));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function matchUrl(name: string, card: TasteCard, origin = APP.url) {
  const q = new URLSearchParams({ n: name.trim(), d: toB64(JSON.stringify(card)) });
  return `${origin}/match?${q}`;
}

/** リンクの中身を読む。人から来たものなので、形が違えば null、長すぎる文字は切る */
export function readCard(d: string | null): TasteCard | null {
  if (!d) return null;
  try {
    const raw = JSON.parse(fromB64(d)) as Partial<TasteCard>;
    if (!Array.isArray(raw.t) || raw.t.length !== TASTE_AXES.length) return null;
    const t = raw.t.map((v) => (typeof v === "number" && v >= 1 && v <= 5 ? v : null));
    const f = (Array.isArray(raw.f) ? raw.f : [])
      .filter((x): x is Fav => Array.isArray(x) && x.length === 5 && x.slice(0, 4).every((s) => typeof s === "string") && !!x[0])
      .slice(0, 3)
      .map(([name, kind, style, origin, taste]) => {
        const lv = (v: unknown) => (typeof v === "number" ? Math.min(5, Math.max(1, Math.round(v))) : 3);
        const t = Array.isArray(taste) ? taste.slice(0, 4).map(lv) : [];
        while (t.length < 4) t.push(3);
        return [name.slice(0, 40), kind.slice(0, 20), style.slice(0, 20), origin.slice(0, 20), t] as Fav;
      });
    return hasTaste(t) ? { t, f } : null;
  } catch {
    return null;
  }
}

export type Match = {
  /** 相性（0〜100） */
  score: number;
  /** ふたりとも強め／控えめが好きな味 */
  bothHigh: string[];
  bothLow: string[];
  /** いちばん違う味。more は相手のほうが強いのが好きか */
  differ: { axis: string; more: boolean } | null;
};

/** ふたりの好みを比べる。両方に数字がある味が2つ未満なら null */
export function compare(mine: (number | null)[], theirs: (number | null)[]): Match | null {
  const rows = TASTE_AXES.map(([axis], i) => ({ axis, a: mine[i], b: theirs[i] })).filter(
    (r): r is { axis: string; a: number; b: number } => r.a !== null && r.b !== null,
  );
  if (rows.length < 2) return null;
  const gap = rows.reduce((sum, r) => sum + Math.abs(r.a - r.b), 0) / rows.length;
  const far = [...rows].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))[0];
  return {
    score: Math.round(100 * (1 - gap / 4)),
    bothHigh: rows.filter((r) => r.a >= 3.5 && r.b >= 3.5).map((r) => r.axis),
    bothLow: rows.filter((r) => r.a <= 2.5 && r.b <= 2.5).map((r) => r.axis),
    differ: Math.abs(far.a - far.b) >= 1 ? { axis: far.axis, more: far.b > far.a } : null,
  };
}

const NAME_KEY = `${APP.id}:my-name`;
export function loadMyName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveMyName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
}
