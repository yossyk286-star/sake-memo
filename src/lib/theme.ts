/** 見た目の設定（明るさとテーマ色）。この端末の中だけに保存する */
/** time は夜（18時〜6時）だけ暗くする */
export type Appearance = "auto" | "light" | "dark" | "time";

/** 「時間で」のときの夜（18時〜朝6時） */
export function isNight(d = new Date()) {
  const h = d.getHours();
  return h >= 18 || h < 6;
}

export const ACCENTS = [
  { id: "indigo", label: "藍", reading: "あい", light: "#2a4a8c", dark: "#8da4e8", bgDark: "#11131c" },
  { id: "blue", label: "縹", reading: "はなだ", light: "#2f6a9e", dark: "#6fb0e6", bgDark: "#0c141c" },
  { id: "wine", label: "蘇芳", reading: "すおう", light: "#9a3a4a", dark: "#e08a96", bgDark: "#1a1013" },
  { id: "amber", label: "琥珀", reading: "こはく", light: "#a86a1c", dark: "#e6a64f", bgDark: "#19140e" },
  { id: "green", label: "若竹", reading: "わかたけ", light: "#3c7a5a", dark: "#7cc79c", bgDark: "#0e1714" },
  { id: "purple", label: "江戸紫", reading: "えどむらさき", light: "#66429a", dark: "#ae96dc", bgDark: "#14121d" },
  { id: "graphite", label: "墨", reading: "すみ", light: "#3a3d46", dark: "#c9ccd6", bgDark: "#16171a" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

/** text：文字の大きさ。large は画面全体を少し大きく（暗いお店で読みやすく） */
export type Theme = { appearance: Appearance; accent: AccentId; text?: "normal" | "large" };

const KEY = "sake-memo:theme";
export const DEFAULT_THEME: Theme = { appearance: "auto", accent: "indigo" };

/** 画面の背景色（ステータスバーの色に使う）。globals.css の --bg と合わせる。ダークはテーマ色ごとの bgDark */
const BG_LIGHT = "#f2f2f7";

export function loadTheme(): Theme {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, JSON.stringify(theme));
  } catch {}
  applyTheme(theme);
}

/** <html> の data-theme / data-accent を切り替える（色は globals.css 側で決める） */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme.appearance === "auto") delete root.dataset.theme;
  else if (theme.appearance === "time") root.dataset.theme = isNight() ? "dark" : "light";
  else root.dataset.theme = theme.appearance;
  root.dataset.accent = theme.accent;
  if (theme.text === "large") root.dataset.text = "large";
  else delete root.dataset.text;
  const dark = root.dataset.theme === "dark" || (theme.appearance === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", dark ? (ACCENTS.find((a) => a.id === theme.accent) ?? ACCENTS[0]).bgDark : BG_LIGHT);
  });
}

/**
 * 画面が出る前に読む小さなスクリプト。React より先に色を決めて、白く光ったり色が切り替わって見えたりしないようにする。
 * layout.tsx の <head> に埋め込む
 */
export const THEME_BOOT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"{}");var r=document.documentElement;if(t.appearance==="light"||t.appearance==="dark")r.dataset.theme=t.appearance;if(t.appearance==="time"){var h=new Date().getHours();r.dataset.theme=h>=18||h<6?"dark":"light";}r.dataset.accent=t.accent||"indigo";if(t.text==="large")r.dataset.text="large";}catch(e){}})();`;
