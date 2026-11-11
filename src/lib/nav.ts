/**
 * アプリの中で移った画面の順番（このタブの間だけ）。左上の ‹ や保存したあとに「来た画面」へ戻るのに使う。
 * 直接開いたときなど、来た画面がわからなければ各画面の決まった行き先へ戻る
 */
const KEY = "sake-memo:nav";
const LAST = "sake-memo:last-path";
/** 戻る先にしない画面（入力の途中の画面） */
const SKIP = ["/new", "/edit"];

function load(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(s: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s.slice(-30)));
  } catch {}
}

// ブラウザの「戻る」（iPhone の左端からのスワイプなど）で移ったとき true
let popped = false;
if (typeof window !== "undefined") window.addEventListener("popstate", () => (popped = true));

/** 画面を移るたびに呼ぶ。ブラウザの戻るで1つ前の画面へ戻ったときは、積まずに外す */
export function trackNav(url: string) {
  const s = load();
  const back = popped;
  popped = false;
  if (s[s.length - 1] === url) return;
  if (back && s[s.length - 2] === url) s.pop();
  else s.push(url);
  save(s);
  try {
    if (!SKIP.includes(url.split("?")[0])) localStorage.setItem(LAST, url);
  } catch {}
}

/** 前にアプリを閉じたときの画面（「開いたときの画面：前の画面」に使う） */
export function lastPath() {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
}

function current() {
  return location.pathname + location.search;
}

function findBack() {
  const s = load();
  const cur = current();
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === cur || SKIP.includes(s[i].split("?")[0])) continue;
    return i;
  }
  return -1;
}

/** 来た画面。わからなければ fallback */
export function backTarget(fallback: string) {
  const i = findBack();
  return i < 0 ? fallback : load()[i];
}

/** 来た画面へ戻る前に、その先に積んだ分を外す（戻ったあとの ‹ がまた奥へ行かないように） */
export function popTo(url: string) {
  const s = load();
  const i = s.lastIndexOf(url);
  if (i >= 0) save(s.slice(0, i + 1));
}
