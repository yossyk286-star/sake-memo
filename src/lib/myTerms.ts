import type { Term } from "./glossary";

/** 自分で調べて辞典に足した用語 */
export type MyTerm = Term & { addedAt: number };

const KEY = "sake-memo:my-terms";

export function loadMyTerms(): MyTerm[] {
  try {
    const terms = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(terms) ? terms : [];
  } catch {
    return [];
  }
}

export function saveMyTerms(terms: MyTerm[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(terms));
  } catch {}
}
