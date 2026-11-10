"use client";

import { useEffect, useId, useState } from "react";
import { APP } from "@/lib/appeal";
import { tr } from "@/lib/i18n";

const MAX = 3;
const keyOf = (name: string) => `${APP.id}:recent-search-${name}`;

function load(name: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(name)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/**
 * 検索欄。押すと欄が広がって右に「やめる」が出て、空のときは最近探した言葉（3つ）を下に出す。
 * 探した言葉は欄を離れたときに覚える（端末の中だけ）
 */
export default function SearchField({
  id,
  name,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  /** 覚えておく場所の名前（records・glossary など） */
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const listId = useId();
  useEffect(() => setRecent(load(name)), [name]);

  const remember = () => {
    const q = value.trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX);
    setRecent(next);
    try {
      localStorage.setItem(keyOf(name), JSON.stringify(next));
    } catch {}
  };
  const showList = open && !value && recent.length > 0;

  return (
    <div className="search-wrap" data-open={open ? "" : undefined}>
      <input
        id={id}
        type="search"
        className="input"
        enterKeyHint="search"
        placeholder={placeholder}
        value={value}
        aria-controls={showList ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          remember();
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {open && (
        <button
          type="button"
          className="text-btn search-cancel"
          // 押した瞬間に欄から外れて消えないよう、押し始めでは何もしない
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          {tr("やめる")}
        </button>
      )}
      {showList && (
        <div className="search-recent" id={listId} role="listbox" aria-label={tr("最近探したもの")}>
          <p className="search-recent-head">{tr("最近探したもの")}</p>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              role="option"
              aria-selected={false}
              className="search-recent-item"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onChange(r)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
