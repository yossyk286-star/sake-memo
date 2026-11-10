/**
 * 下から出るシートの後ろで画面を奥へ下げるとき、いま見えているあたりを中心に縮めるための目印。
 * シートを開くときに呼ぶ（縮める動き自体は CSS の body:has(.sheet-backdrop) .app）
 */
export function markSheetOrigin() {
  document.documentElement.style.setProperty("--sheet-origin-y", `${window.scrollY + window.innerHeight * 0.4}px`);
}
