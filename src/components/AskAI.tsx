"use client";

import { useEffect, useState } from "react";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import type { QA } from "@/lib/types";

/**
 * 記録の画面から AI に質問する。答えは記録に残して、あとから読み返せる。
 * context は記録の要約（AI に渡す文）、suggestions はタップで入る質問の例
 */
export default function AskAI({
  context,
  suggestions,
  history,
  onAnswered,
}: {
  context: string;
  suggestions: string[];
  history: QA[];
  onAnswered: (qa: QA) => Promise<void>;
}) {
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
          history: history.map(({ q, a }) => ({ q, a })),
          passcode: normalizePasscode(passcode),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSaved(false);
      if (!res.ok) throw new Error(data.error ?? "答えをもらえませんでした");
      savePasscode(normalizePasscode(passcode));
      await onAnswered({ q, a: data.answer, at: Date.now() });
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "答えをもらえませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card ask-ai">
      <h2 style={{ fontSize: 16 }}>AI に聞く</h2>
      {history.map((h) => (
        <div key={h.at} className="ask-qa">
          <p className="ask-q">{h.q}</p>
          <p className="ask-a">{h.a}</p>
        </div>
      ))}
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
        <label htmlFor="ask-input" className="visually-hidden">
          質問
        </label>
        <input
          id="ask-input"
          className="input"
          placeholder={history.length ? "続けて聞く" : "この記録について聞く"}
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
