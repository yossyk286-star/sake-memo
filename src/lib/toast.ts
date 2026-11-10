/**
 * 画面の上に小さなカプセルで出すお知らせ。どの画面からでも toast("保存しました") で出せる。
 * 画面を移ってもそのまま残り、2秒ほどで縮んで消える
 */
export type ToastTone = "ok" | "star" | "warn";
export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  /** ついでの1ボタン（「見る」など） */
  action?: { label: string; href: string };
};

export const TOAST_EVENT = "app-toast";
let seq = 0;

export function toast(message: string, opts: { tone?: ToastTone; action?: Toast["action"] } = {}) {
  if (typeof window === "undefined") return;
  const detail: Toast = { id: ++seq, message, tone: opts.tone ?? "ok", action: opts.action };
  window.dispatchEvent(new CustomEvent<Toast>(TOAST_EVENT, { detail }));
}
