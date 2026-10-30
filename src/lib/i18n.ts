/**
 * 日本語と英語の切り替え。画面の文言は日本語のまま書いて tr("…") で包み、英語のときだけ en.json の訳に差し替える。
 * 言語は開いたときに一度だけ決める（LangGate）。設定で切り替えたら読み直す
 */
export type Lang = "ja" | "en";
export type LangSetting = "auto" | Lang;

const KEY = "sake-memo:lang";

let lang: Lang = "ja";
let dict: Record<string, string> = {};

export function getLang(): Lang {
  return lang;
}

export function loadLangSetting(): LangSetting {
  try {
    const s = localStorage.getItem(KEY);
    return s === "ja" || s === "en" ? s : "auto";
  } catch {
    return "auto";
  }
}

/** 設定を保存して、新しい言語で開き直す */
export function saveLangSetting(setting: LangSetting) {
  try {
    if (setting === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, setting);
  } catch {}
  location.reload();
}

/** 設定が「自動」なら、スマホの言語が日本語のときだけ日本語にする */
export function detectLang(): Lang {
  const setting = loadLangSetting();
  if (setting !== "auto") return setting;
  const first = (navigator.languages?.[0] ?? navigator.language ?? "ja").toLowerCase();
  return first.startsWith("ja") ? "ja" : "en";
}

/** 英語のときは訳を読み込んでから画面を出す */
export async function initLang(next: Lang) {
  if (next === "en") dict = (await import("./i18n/en.json")).default as Record<string, string>;
  lang = next;
  document.documentElement.lang = next;
  if (next === "en") document.title = tr("さけメモ");
}

/**
 * 画面に出す文言。tr("{0}件の記録", n) のように {0} {1}… に値を入れる。
 * 入れる値が「日本酒」など訳のある言葉なら、それも訳す。訳が無い言葉（自分で入力した名前など）はそのまま出す
 */
export function tr(ja: string, ...args: (string | number | null | undefined)[]): string {
  const s = lang === "en" ? (dict[ja] ?? joined(ja)) : ja;
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i: string) => {
    const v = args[Number(i)];
    return typeof v === "string" ? tr(v) : String(v ?? "");
  }) : s;
}

/** 訳の無い「日本酒・純米」は、区切りごとに訳せればつなげ直す（「Sake · Junmai」） */
function joined(ja: string): string {
  for (const sep of ["・", "、", " × "]) {
    if (!ja.includes(sep)) continue;
    const parts = ja.split(sep);
    // 「Natural」のように、もともと英語の言葉はそのまま使う
    if (parts.every((p) => dict[p] !== undefined || /^[\x20-\x7e]+$/.test(p)))
      return parts.map((p) => dict[p] ?? p).join(dict[sep] ?? sep);
  }
  return ja;
}

/** 日付の並べ方。英語は「Oct 25 (Sun)」 */
export function locale(): string {
  return lang === "en" ? "en-US" : "ja-JP";
}

/** 「日本酒・純米」のように並べる。それぞれ訳して、英語は「Sake · Junmai」 */
export function trJoin(parts: (string | null | undefined | false | 0)[], sep = "・"): string {
  return parts
    .filter((p): p is string => !!p)
    .map((p) => tr(p))
    .join(tr(sep));
}

/** 画面に出す値。文字なら訳し（「日本酒」→「Sake」）、数字などはそのまま返す */
export function trv<T>(v: T): T {
  return (typeof v === "string" ? tr(v) : v) as T;
}
