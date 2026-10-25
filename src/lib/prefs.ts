/** 自分で登録する好み。記録が少ないうちも、メニューのおすすめに使う */
export type MyPrefs = {
  /** 好きな種類（日本酒、ワインなど） */
  kinds: string[];
  /** 苦手な種類 */
  avoidKinds: string[];
  /** 好きなタイプ（純米吟醸、赤など） */
  styles: string[];
  /** 好きな飲み方（冷酒、ロックなど） */
  serves: string[];
  /** 好きな産地（都道府県・国） */
  origins: string[];
  /** 好きな味（フレーバータグや自由入力） */
  likes: string[];
  /** 苦手な味 */
  dislikes: string[];
  /** 好きな味の寄り方。1〜5、決めていなければ null */
  sweetness: number | null;
  body: number | null;
  aroma: number | null;
  /** 1杯の予算の上限（円）。決めていなければ null */
  budget: number | null;
};

const KEY = "sake-memo:prefs";

export const EMPTY_PREFS: MyPrefs = {
  kinds: [],
  avoidKinds: [],
  styles: [],
  serves: [],
  origins: [],
  likes: [],
  dislikes: [],
  sweetness: null,
  body: null,
  aroma: null,
  budget: null,
};

export function loadPrefs(): MyPrefs {
  try {
    return { ...EMPTY_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY_PREFS;
  }
}

export function savePrefs(prefs: MyPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

export function hasPrefs(p: MyPrefs) {
  const lists = [p.kinds, p.avoidKinds, p.styles, p.serves, p.origins, p.likes, p.dislikes];
  return lists.some((l) => l.length > 0) || p.sweetness !== null || p.body !== null || p.aroma !== null;
}
