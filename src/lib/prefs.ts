/** 自分で登録する好み。記録が少ないうちも、メニューのおすすめに使う */
export type MyPrefs = {
  /** 好きな種類（日本酒、ワインなど） */
  kinds: string[];
  /** 好きなタイプ（純米吟醸、赤など） */
  styles: string[];
  /** 好きな味（フレーバータグや自由入力） */
  likes: string[];
  /** 苦手な味 */
  dislikes: string[];
};

const KEY = "sake-memo:prefs";

export const EMPTY_PREFS: MyPrefs = { kinds: [], styles: [], likes: [], dislikes: [] };

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
  return p.kinds.length + p.styles.length + p.likes.length + p.dislikes.length > 0;
}
