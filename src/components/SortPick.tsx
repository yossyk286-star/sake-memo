"use client";

import { tr } from "@/lib/i18n";

/** 並び替えのボタン。押すとスマホの選択肢が開く。いまの並び方を文字で出す */
export default function SortPick<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  const current = options.find((o) => o.key === value) ?? options[0];
  return (
    <label className="sort-pick" data-on={value !== options[0].key}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
      </svg>
      <span>{current.label}</span>
      <select aria-label={tr("並び替え")} value={value} onChange={(e) => onChange(e.target.value as K)}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
