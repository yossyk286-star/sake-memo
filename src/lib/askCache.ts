// 「AI に聞く」の答えを端末に残し、同じものを見ながら同じ質問をしたときは AI を呼ばずに出す（料金がかからず、すぐ出る）
const KEY = "sake-memo:ask-cache";
// 端末の保存領域を使いすぎないよう、古いものから捨てる
const MAX = 200;

type Entry = { a: string; at: number };

/** 見ているもの・それまでの会話・質問・言語が全部同じときだけ同じ答えを使う */
export function askKey(parts: { lang: string; context: string; history: { q: string; a: string }[]; q: string }) {
  return JSON.stringify([parts.lang, parts.context, parts.history.map((h) => [h.q, h.a]), parts.q.normalize("NFKC")]);
}

function load(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function findAnswer(key: string): string | null {
  return load()[key]?.a ?? null;
}

export function saveAnswer(key: string, a: string) {
  const all = load();
  all[key] = { a, at: Date.now() };
  const kept = Object.entries(all)
    .sort(([, x], [, y]) => y.at - x.at)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}
