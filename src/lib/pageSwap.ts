/**
 * 画面を替えるあいだ、画面全体がふわっと出直す動き（.page-enter）を止める。
 * タブで移るたびに前の画面が消えて薄い所から出てくると、読み込み中のように見えるため。
 * dir が next / prev のときは、新しい画面の中身だけ押した向きから入れ替える（調べるの切り替え）
 */
export function holdPageFade(dir: "next" | "prev" | "tab") {
  const root = document.documentElement;
  // いまの画面の中身は動かさない（入れ替わって出てくる側だけ動かす）
  document.querySelectorAll<HTMLElement>(".page-enter").forEach((el) => (el.dataset.leaving = ""));
  root.dataset.swap = dir;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    // 外すと止めていた動きが始めから出てしまうので、移った先の枠は「出終わった」印を付けてから外す
    document.querySelectorAll<HTMLElement>(".page-enter").forEach((el) => (el.dataset.entered = ""));
    delete root.dataset.swap;
  }, 900);
}
let timer = 0;

/** 最初の画面を描き終わったか。終わったあとの画面は、端末に覚えた内容ですぐ描き始めてよい（最初はサーバーの絵と合わせる） */
export let clientReady = false;
export function markClientReady() {
  clientReady = true;
}
