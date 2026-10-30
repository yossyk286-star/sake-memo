"use client";

import { useEffect, useId, useState } from "react";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import type { QA } from "@/lib/types";
import Skeleton from "./Skeleton";

/**
 * 記録の画面や調べた結果から AI に質問する。
 * history と onAnswered を渡すと答えを記録に残せる。渡さなければ画面を閉じるまでだけ覚えておく。
 * context は見ているものの要約（AI に渡す文）、suggestions はタップで入る質問の例。
 * bare は枠と見出しなし（カードの中に入れるとき）
 */
export default function AskAI({
  context,
  suggestions,
  history,
  onAnswered,
  bare = false,
}: {
  context: string;
  suggestions: string[];
  history?: QA[];
  onAnswered?: (qa: QA) => Promise<void>;
  bare?: boolean;
}) {
  const inputId = useId();
  const [local, setLocal] = useState<QA[]>([]);
  const shown = history ?? local;
  const [question, setQuestion] = useState("");
  const [passcode, setPasscode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSaved(!!p);
  }, []);

  async function ask(q: string) {
    q = q.trim();
    if (!q) return;
    if (!passcode) return setError("合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため聞けません");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ask: q,
          context,
          history: shown.map(({ q, a }) => ({ q, a })),
          passcode: normalizePasscode(passcode),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSaved(false);
      if (!res.ok) throw new Error(data.error ?? "答えをもらえませんでした");
      savePasscode(normalizePasscode(passcode));
      const qa = { q, a: data.answer, at: Date.now() };
      if (onAnswered) await onAnswered(qa);
      if (!history) setLocal((l) => [...l, qa]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "答えをもらえませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={bare ? "ask-ai ask-ai-bare" : "card ask-ai"}>
      {!bare && <h2 style={{ fontSize: 16 }}>AI に聞く</h2>}
      {shown.map((h) => (
        <div key={h.at} className="ask-qa">
          <p className="ask-q">{h.q}</p>
          <p className="ask-a">{h.a}</p>
        </div>
      ))}
      {busy && <Skeleton plain label="考えています…" lines={3} />}
      <div className="scroll-row" style={{ margin: 0 }}>
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip" disabled={busy} onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      {!saved && (
        <input
          className="input"
          aria-label="合言葉"
          placeholder="合言葉"
          autoComplete="off"
          autoCapitalize="off"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
      )}
      <form
        className="row"
        style={{ flexWrap: "nowrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor={inputId} className="visually-hidden">
          質問
        </label>
        <input
          id={inputId}
          className="input"
          placeholder={shown.length ? "続けて聞く" : "この記録について聞く"}
          maxLength={300}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="btn-secondary" disabled={busy || !question.trim()}>
          {busy ? "考え中…" : "聞く"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
