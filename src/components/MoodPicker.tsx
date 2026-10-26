"use client";

import { useRef, useState } from "react";

/**
 * 今日の気分を選ぶプルダウン。一覧から選ぶか、文字で入れて「並べる」。
 * 入れた文字で候補が絞られる
 */
export default function MoodPicker({
  labels,
  value,
  busy,
  onPick,
  onText,
  suggest,
  placeholder = "今日の気分（選ぶ・入力）",
}: {
  labels: string[];
  /** いま並べている気分。なければ null */
  value: string | null;
  busy?: boolean;
  onPick: (label: string | null) => void;
  onText: (text: string) => void;
  /** 入れた文字に合う気分（言葉の言いかえも含めて探すとき） */
  suggest?: (q: string) => string[];
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const q = text.trim();
  // 選んだ気分がそのまま入っているときは全部出す
  const options =
    q && !labels.includes(q)
      ? (suggest?.(q) ?? labels.filter((l) => l.includes(q)))
      : labels;

  function pick(label: string) {
    setText(label);
    setOpen(false);
    onPick(label);
  }

  function submit() {
    if (!q) return;
    setOpen(false);
    if (labels.includes(q)) onPick(q);
    else onText(q);
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
        <div className="mood-box">
          <label htmlFor="scan-mood" className="visually-hidden">
            今日の気分
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
            placeholder={placeholder}
            value={text}
            onFocus={() => {
              if (closing.current) clearTimeout(closing.current);
              setOpen(true);
            }}
            onBlur={() => {
              closing.current = setTimeout(() => setOpen(false), 150);
            }}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
          />
          <button
            type="button"
            className="mood-toggle"
            aria-label={open ? "気分の一覧を閉じる" : "気分の一覧を開く"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(!open)}
          >
            ▾
          </button>
          {open && options.length > 0 && (
            <ul id="scan-mood-list" role="listbox" className="mood-list">
              {options.map((l) => (
                <li
                  key={l}
                  role="option"
                  aria-selected={value === l}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(l)}
                >
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
        {value ? (
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0, height: 44, padding: "0 12px" }}
            onClick={() => {
              setText("");
              onPick(null);
            }}
          >
            戻す
          </button>
        ) : (
          <button
            type="submit"
            className="btn-secondary"
            style={{ flexShrink: 0 }}
            disabled={!q || busy}
          >
            {busy ? "調べ中…" : "並べる"}
          </button>
        )}
      </form>
    </div>
  );
}
