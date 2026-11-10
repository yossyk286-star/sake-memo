/**
 * 画面がつながって動く（View Transitions）。iPhone の Safari 18 から使える。
 * 使えない端末や「動きを減らす」の人は、いままでどおりぱっと切り替える。
 */

type VT = { finished: Promise<void> };
type DocVT = Document & { startViewTransition?: (cb: () => Promise<void>) => VT };

/** 名前を付けた要素の印。終わったら外す */
const MARK = "vtName";

export function nameForTransition(el: Element | null, name: string) {
  if (!(el instanceof HTMLElement)) return;
  el.style.setProperty("view-transition-name", name);
  el.dataset[MARK] = "";
}

function clearNames() {
  document.querySelectorAll<HTMLElement>("[data-vt-name]").forEach((el) => {
    el.style.removeProperty("view-transition-name");
    delete el.dataset[MARK];
  });
}

/**
 * go() で画面を移り、ready() が true になった（次の画面が描けた）ところで動かす。
 * kind は動き方（open＝一覧→詳細、back＝詳細→一覧、tab＝タブの切り替え）
 */
export function transitionTo(go: () => void, ready: () => boolean, kind: "open" | "back" | "tab") {
  const d = document as DocVT;
  if (!d.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    clearNames();
    go();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = kind;
  const t = d.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        go();
        const start = performance.now();
        const tick = () => {
          // 待ちすぎると画面が止まって見えるので、0.6秒で見切る
          if (ready() || performance.now() - start > 600) resolve();
          // 移る途中は画面の描き直しが止まり requestAnimationFrame が呼ばれないので、タイマーで見る
          else window.setTimeout(tick, 16);
        };
        window.setTimeout(tick, 0);
      }),
  );
  t.finished.finally(() => {
    // 止めていた「ふわっと出る」動きが、終わったあとにもう一度走らないようにする
    document.querySelectorAll(".page-enter").forEach((el) => el.setAttribute("data-entered", ""));
    delete root.dataset.vt;
    clearNames();
  });
}

/** ふつうのクリック（新しいタブで開くなどではない）か */
export function isPlainClick(e: React.MouseEvent) {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
