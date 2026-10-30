"use client";

import { useEffect, useRef, useState } from "react";

type Field = HTMLInputElement | HTMLTextAreaElement;
type Spot = { top: number; left: number };

/** × を出す文字の欄。日付・数値・ファイルなどは対象外 */
const TEXT_TYPES = new Set(["text", "search", "tel", "url", "email"]);

function clearable(el: EventTarget | null): el is Field {
  if (el instanceof HTMLTextAreaElement) return el.classList.contains("input") && !el.readOnly && !el.disabled;
  if (!(el instanceof HTMLInputElement)) return false;
  return el.classList.contains("input") && TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled;
}

const SIZE = 30;

/** ボタンを置く位置。欄の右端（文字の欄は縦の真ん中、メモ欄は右上） */
function spotOf(el: Field): Spot {
  const r = el.getBoundingClientRect();
  // 今日の気分は右端に ▾ があるので、その左に置く
  const right = el.closest(".mood-box") ? 36 : 6;
  const top = el instanceof HTMLTextAreaElement ? r.top + 8 : r.top + (r.height - SIZE) / 2;
  return { top: Math.round(top), left: Math.round(r.right - right - SIZE) };
}

/**
 * 入力中の欄に文字があるとき、右端に × を出して中身を消せるようにする。
 * 画面ごとに部品を差し替えずに済むよう、フォーカス中の .input の上に重ねて表示する。
 */
export default function ClearField() {
  const [field, setField] = useState<Field | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const fieldRef = useRef<Field | null>(null);

  useEffect(() => {
    const sync = () => {
      const el = fieldRef.current;
      const show = !!el && el.value !== "";
      if (el) el.toggleAttribute("data-clearing", show);
      setSpot((prev) => {
        if (!show || !el) return null;
        const next = spotOf(el);
        return prev && prev.top === next.top && prev.left === next.left ? prev : next;
      });
    };
    const onFocusIn = (e: FocusEvent) => {
      fieldRef.current?.removeAttribute("data-clearing");
      fieldRef.current = clearable(e.target) ? e.target : null;
      setField(fieldRef.current);
      sync();
    };
    const onFocusOut = (e: FocusEvent) => {
      const el = fieldRef.current;
      if (!el || e.target !== el) return;
      el.removeAttribute("data-clearing");
      fieldRef.current = null;
      setField(null);
      setSpot(null);
    };
    const onInput = (e: Event) => {
      if (e.target === fieldRef.current) sync();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput, true);
    if (clearable(document.activeElement)) {
      fieldRef.current = document.activeElement;
      setField(fieldRef.current);
      sync();
    }
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  // 入力中はスクロールやキーボードの出入りで欄が動くので、毎フレーム位置を合わせる
  useEffect(() => {
    if (!field) return;
    let raf = 0;
    const follow = () => {
      if (field.value !== "") {
        const next = spotOf(field);
        setSpot((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next));
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [field]);

  if (!field || !spot) return null;

  const clear = () => {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    // React の onChange に届くよう、ネイティブの setter で空にしてから input を送る
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, "");
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus();
  };

  return (
    <button
      type="button"
      className="clear-field"
      aria-label="入力を消す"
      style={{ top: spot.top, left: spot.left }}
      // 押しても欄からフォーカスが外れない（キーボードを閉じない）ようにする
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={clear}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
