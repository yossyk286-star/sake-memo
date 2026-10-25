import { TERMS, type Term } from "./glossary";

export type Question = { term: Term; hint: string; choices: string[]; answer: number };

/** 日付などの文字列から決まる乱数。同じ日なら同じ問題になる */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 説明文の中の答えの言葉を伏せる（「スパークリング」の説明に「スパークリング」と出ないように） */
function maskTerm(text: string, term: string) {
  return text.split(term).join("〇〇");
}

/**
 * 用語の説明を見て、どの用語か4つから選ぶ問題。
 * まぎらわしいほうが勉強になるので、ほかの選択肢はなるべく同じ分類から出す
 */
export function makeQuestion(seed: string, pool: Term[] = TERMS): Question {
  const rand = seeded(seed);
  const term = pool[Math.floor(rand() * pool.length)];
  const same = pool.filter((t) => t.category === term.category && t.term !== term.term);
  const others = pool.filter((t) => t.category !== term.category);
  const wrong = [...shuffle(same, rand), ...shuffle(others, rand)].slice(0, 3).map((t) => t.term);
  const choices = shuffle([term.term, ...wrong], rand);
  return { term, hint: maskTerm(term.description, term.term), choices, answer: choices.indexOf(term.term) };
}
