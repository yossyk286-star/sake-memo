/** 見た目の設定（明るさとテーマ色）。この端末の中だけに保存する */
export type Appearance = "auto" | "light" | "dark";

export const ACCENTS = [
  { id: "indigo", label: "藍", light: "#3d4fa8", dark: "#8c9cf0" },
  { id: "blue", label: "青", light: "#0a6cdc", dark: "#4a9eff" },
  { id: "wine", label: "葡萄", light: "#a3264c", dark: "#f0708f" },
  { id: "amber", label: "琥珀", light: "#b8650c", dark: "#f5a742" },
  { id: "green", label: "若竹", light: "#2f7d55", dark: "#5cc98e" },
  { id: "purple", label: "藤", light: "#7344b8", dark: "#b494f2" },
  { id: "graphite", label: "墨", light: "#3a3d46", dark: "#c9ccd6" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export type Theme = { appearance: Appearance; accent: AccentId };

const KEY = "sake-memo:theme";
export const DEFAULT_THEME: Theme = { appearance: "auto", accent: "indigo" };

/** 画面の背景色（ステータスバーの色に使う）。globals.css の --bg と合わせる */
const BG = { light: "#f2f2f7", dark: "#000000" };

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
  const dark =
    theme.appearance === "dark" ||
    (theme.appearance === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", dark ? BG.dark : BG.light);
  });
}

/**
 * 画面が出る前に読む小さなスクリプト。React より先に色を決めて、白く光ったり色が切り替わって見えたりしないようにする。
 * layout.tsx の <head> に埋め込む
 */
export const THEME_BOOT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})||"{}");var r=document.documentElement;if(t.appearance==="light"||t.appearance==="dark")r.dataset.theme=t.appearance;r.dataset.accent=t.accent||"indigo";}catch(e){}})();`;
