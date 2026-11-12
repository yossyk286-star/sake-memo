"use client";

import { useState } from "react";
import { askServer, blobToBase64 } from "@/lib/askServer";
import { tr, trv } from "@/lib/i18n";
import { shrinkForReading } from "@/lib/photo";
import type { Spec } from "@/lib/types";

/** 裏ラベルを撮って、精米歩合・日本酒度などのスペックを読む（12）。読んだものは × で外せる */
export default function SpecScan({ specs, onChange }: { specs: Spec[]; onChange: (s: Spec[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function read(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const image = await blobToBase64(await shrinkForReading(file));
      const { specs: found } = await askServer<{ specs: Spec[] }>({ specImage: image });
      if (found.length === 0) throw new Error("スペックが見つかりませんでした。裏ラベルの文字が写るように撮ってみてください");
      // 同じ項目は新しく読んだほうにする
      onChange([...specs.filter((s) => !found.some((f) => f.label === s.label)), ...found]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み取りに失敗しました");
    }
    setBusy(false);
  }

  return (
    <div className="field">
      <span className="label">{tr("スペック（裏ラベル）")}</span>
      {specs.length > 0 && (
        <ul className="spec-grid">
          {specs.map((s) => (
            <li key={s.label}>
              <span>{trv(s.label)}</span>
              <b>{s.value}</b>
              <button type="button" className="spec-x" aria-label={tr("{0}を外す", s.label)} onClick={() => onChange(specs.filter((x) => x !== s))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="btn-secondary" style={{ cursor: "pointer" }} aria-busy={busy}>
        {busy ? tr("読んでいます…") : specs.length ? tr("裏ラベルを撮り直す") : tr("裏ラベルを撮ってスペックを読む")}
        <input type="file" accept="image/*" capture="environment" className="visually-hidden" disabled={busy} onChange={read} />
      </label>
      {error && (
        <p className="error field-msg" role="alert">
          {trv(error)}
        </p>
      )}
    </div>
  );
}
