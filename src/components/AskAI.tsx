"use client";

import { useEffect, useId, useState } from "react";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import type { QA } from "@/lib/types";
import Steps from "./Steps";
import { askConfirm } from "./ConfirmSheet";
import { getLang, tr, trv } from "@/lib/i18n";

/**
 * 記録の画面や調べた結果から AI に質問する。
 * history と onAnswered を渡すと答えを記録に残せる。渡さなければ画面を閉じるまでだけ覚えておく。
 * context は見ているものの要約（AI に渡す文）、suggestions はタップで入る質問の例。
 * bare は枠と見出しなし（カードの中に入れるとき）
 * onDeleted は消した質問の at を受け取って記録から外す（渡さなければ画面の中だけで消す）
 */
export default function AskAI({
  context,
  suggestions,
  history,
  onAnswered,
  onDeleted,
  bare = false,
}: {
  context: string;
  suggestions: string[];
  history?: QA[];
  onAnswered?: (qa: QA) => Promise<void>;
  onDeleted?: (ats: number[]) => Promise<void>;
  bare?: boolean;
}) {
  const inputId = useId();
  const [local, setLocal] = useState<QA[]>([]);
  const shown = history ?? local;
  const [question, setQuestion] = useState("");
  const [passcode, setPasscode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // 届いた分から書かれていくように出す答え
  const [partial, setPartial] = useState<{ q: string; a: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSaved(!!p);
  }, []);

  /** 質問と答えを消す（確認してから）。ats が全部なら会話をまるごと消す */
  async function remove(ats: number[]) {
    const all = ats.length > 1;
    const ok = await askConfirm({
      message: all ? tr("AI との会話をすべて消しますか？") : tr("この質問と答えを消しますか？"),
      action: all ? tr("すべて消す") : tr("消す"),
    });
    if (!ok) return;
    if (onDeleted) await onDeleted(ats);
    if (!history) setLocal((l) => l.filter((h) => !ats.includes(h.at)));
  }

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
          lang: getLang(),
          stream: true,
        }),
      });
      let answer = "";
      if (res.ok && res.body && res.headers.get("Content-Type")?.startsWith("text/plain")) {
        savePasscode(normalizePasscode(passcode));
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        setPartial({ q, a: "" });
        try {
          for (let r = await reader.read(); !r.done; r = await reader.read()) {
            answer += dec.decode(r.value, { stream: true });
            setPartial({ q, a: answer });
          }
        } catch {
          throw new Error("答えが途中で切れました。もう一度お試しください");
        }
        answer = answer.trim();
        if (!answer) throw new Error("答えをもらえませんでした");
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) setSaved(false);
        if (!res.ok) throw new Error(data.error ?? "答えをもらえませんでした");
        savePasscode(normalizePasscode(passcode));
        answer = data.answer;
      }
      const qa = { q, a: answer, at: Date.now() };
      if (onAnswered) await onAnswered(qa);
      if (!history) setLocal((l) => [...l, qa]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "答えをもらえませんでした");
    } finally {
      setBusy(false);
      setPartial(null);
    }
  }

  return (
    <section className={`${bare ? "ask-ai ask-ai-bare" : "card ask-ai"}${busy ? " ai-glow" : ""}`}>
      {!bare && <h2 style={{ fontSize: 17 }}>{tr("AI に聞く")}</h2>}
      {shown.map((h) => (
        <div key={h.at} className="ask-qa">
          <p className="ask-q">{trv(h.q)}</p>
          <p className="ask-a">{trv(h.a)}</p>
          <button
            type="button"
            className="ask-del"
            disabled={busy}
            aria-label={tr("この質問と答えを消す")}
            onClick={() => remove([h.at])}
          >
            {tr("消す")}
          </button>
        </div>
      ))}
      {shown.length > 1 && (
        <button type="button" className="ask-del ask-del-all" disabled={busy} onClick={() => remove(shown.map((h) => h.at))}>
          {tr("会話をすべて消す")}
        </button>
      )}
      {partial?.a ? (
        <div className="ask-qa" aria-live="polite">
          <p className="ask-q">{trv(partial.q)}</p>
          <p className="ask-a ask-caret">{partial.a}</p>
        </div>
      ) : (
        busy && <Steps title="考えています" steps={["質問を送りました", "答えを考えています", "答えを書きます"]} at={1} />
      )}
      <div className="scroll-row" style={{ margin: 0 }}>
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip" disabled={busy} onClick={() => ask(s)}>
            {trv(s)}
          </button>
        ))}
      </div>
      {!saved && (
        <input
          className="input"
          aria-label={tr("合言葉")}
          placeholder={tr("合言葉")}
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
          {tr("質問")}
        </label>
        <input
          id={inputId}
          className="input"
          placeholder={shown.length ? tr("続けて聞く") : tr("この記録について聞く")}
          maxLength={300}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="btn-secondary btn-plain" disabled={busy || !question.trim()}>
          {busy ? tr("考え中…") : tr("聞く")}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {trv(error)}
        </p>
      )}
    </section>
  );
}
