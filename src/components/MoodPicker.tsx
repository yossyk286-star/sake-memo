"use client";

import { useEffect, useRef, useState } from "react";
import { tr, trv } from "@/lib/i18n";

/**
 * 今日の気分を選ぶプルダウン。一覧から選ぶか、文字で入れて足していく。
 * いくつでも選べて、選んだものは下に並び、× で外せる。入れた文字で候補が絞られる
 */
export default function MoodPicker({
  labels,
  values,
  busy,
  onChange,
  suggest,
  placeholder = "今日の気分（いくつでも・入力も）",
}: {
  labels: string[];
  /** いま選んでいる気分（入れた言葉も含む） */
  values: string[];
  busy?: boolean;
  onChange: (values: string[]) => void;
  /** 入れた文字に合う気分（言葉の言いかえも含めて探すとき） */
  suggest?: (q: string) => string[];
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const q = text.trim();
  const options = q ? (suggest?.(q) ?? labels.filter((l) => l.includes(q))) : labels;

  // 続けていくつか選べるよう、選んでも閉じない。外を触ったら閉じる
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function toggle(label: string) {
    setText("");
    onChange(values.includes(label) ? values.filter((v) => v !== label) : [...values, label]);
  }

  function submit() {
    if (!q) return;
    setOpen(false);
    setText("");
    // 「甘口、ジン」のように区切って入れたら、別々の気分にする
    const add = q.split(/[、,，・\/／\s]+/).filter((w) => w && !values.includes(w));
    if (add.length > 0) onChange([...values, ...new Set(add)]);
  }

  return (
    <div className="mood-picker">
      <form
        className="row"
        style={{ flexWrap: "nowrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mood-box" ref={box}>
          <label htmlFor="scan-mood" className="visually-hidden">
            {tr("今日の気分")}
          </label>
          <input
            id="scan-mood"
            className="input"
            role="combobox"
            aria-expanded={open}
            aria-controls="scan-mood-list"
            autoComplete="off"
            enterKeyHint="go"
            maxLength={40}
            placeholder={values.length > 0 ? tr("さらに足す（例：ジン）") : tr(placeholder)}
            value={text}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
          />
          <button
            type="button"
            className="mood-toggle"
            aria-label={open ? tr("気分の一覧を閉じる") : tr("気分の一覧を開く")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(!open)}
          >
            ▾
          </button>
          {open && options.length > 0 && (
            <ul
              id="scan-mood-list"
              role="listbox"
              aria-multiselectable="true"
              className="mood-list"
            >
              {options.map((l) => (
                <li
                  key={l}
                  role="option"
                  aria-selected={values.includes(l)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(l)}
                >
                  {trv(l)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {values.length > 0 && !q ? (
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0, height: 44, padding: "0 12px" }}
            onClick={() => {
              setOpen(false);
              onChange([]);
            }}
          >
            {tr("戻す")}
          </button>
        ) : (
          <button
            type="submit"
            className="btn-secondary"
            style={{ flexShrink: 0 }}
            disabled={!q || busy}
          >
            {busy ? tr("調べ中…") : values.length > 0 ? tr("足す") : tr("並べる")}
          </button>
        )}
      </form>
      {values.length > 0 && (
        <div className="mood-chosen" aria-label={tr("選んでいる気分")}>
          {values.map((v) => (
            <button
              key={v}
              type="button"
              className="chip"
              aria-pressed="true"
              aria-label={tr("「{0}」を外す", v)}
              disabled={busy}
              onClick={() => onChange(values.filter((x) => x !== v))}
            >
              {trv(v)}
              <span aria-hidden="true" className="mood-x">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
