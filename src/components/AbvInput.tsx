"use client";

import { useState } from "react";
import { parseAbv } from "@/lib/abv";
import { tr } from "@/lib/i18n";

/** 度数（%）の入力。「15.」のような打ちかけも消えないよう、文字のまま持っておく */
export default function AbvInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : "");
  return (
    <input
      id={id}
      className="input"
      inputMode="decimal"
      placeholder={tr("例：15")}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAbv(e.target.value));
      }}
    />
  );
}
