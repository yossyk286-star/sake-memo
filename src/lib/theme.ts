/** 見た目の設定（明るさとテーマ色）。この端末の中だけに保存する */
export type Appearance = "auto" | "light" | "dark";

export const ACCENTS = [
  { id: "indigo", label: "藍", light: "#3d4fa8", dark: "#8c9cf0", bgDark: "#11131c" },
  { id: "blue", label: "青", light: "#0a6cdc", dark: "#4a9eff", bgDark: "#0b131e" },
  { id: "wine", label: "葡萄", light: "#a3264c", dark: "#f0708f", bgDark: "#190f15" },
  { id: "amber", label: "琥珀", light: "#ad5f0b", dark: "#f5a742", bgDark: "#19140e" },
  { id: "green", label: "若竹", light: "#2f7d55", dark: "#5cc98e", bgDark: "#0d1715" },
  { id: "purple", label: "藤", light: "#7344b8", dark: "#b494f2", bgDark: "#14121d" },
  { id: "graphite", label: "墨", light: "#3a3d46", dark: "#c9ccd6", bgDark: "#16171a" },
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
  else root.dataset.theme = theme.appearance;
  root.dataset.accent = theme.accent;
  if (theme.text === "large") root.dataset.text = "large";
  else delete root.dataset.text;
  const dark =
    theme.appearance === "dark" ||
    (theme.appearance === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", dark ? (ACCENTS.find((a) => a.id === theme.accent) ?? ACCENTS[0]).bgDark : BG_LIGHT);
  });
}

/**
 * 画面が出る前に読む小さなスクリプト。React より先に色を決めて、白く光ったり色が切り替わって見えたりしないようにする。
 * layout.tsx の <head> に埋め込む
 */
export const THEME_BOOT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"{}");var r=document.documentElement;if(t.appearance==="light"||t.appearance==="dark")r.dataset.theme=t.appearance;r.dataset.accent=t.accent||"indigo";if(t.text==="large")r.dataset.text="large";}catch(e){}})();`;
