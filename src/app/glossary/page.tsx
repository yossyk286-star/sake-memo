"use client";

import { useEffect, useState } from "react";
import DailyQuiz from "@/components/DailyQuiz";
import { CATEGORIES, CHOOSING_TIPS, TERMS, type GlossaryCategory } from "@/lib/glossary";
import type { TermLookup } from "@/lib/menuScan";
import { loadMyTerms, saveMyTerms, type MyTerm } from "@/lib/myTerms";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";

const FILTERS: ("すべて" | "自分で追加" | GlossaryCategory)[] = ["すべて", "自分で追加", ...CATEGORIES];

/** 辞典にない言葉を AI に調べてもらい、自分の辞典に足す */
function AddTerm({ query, onAdded }: { query: string; onAdded: (t: MyTerm) => void }) {
  const [passcode, setPasscode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSaved(!!p);
  }, []);

  async function lookup() {
    if (!passcode) return setError("合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため調べられません");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: query.trim(), passcode: normalizePasscode(passcode) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSaved(false);
      if (!res.ok) throw new Error(data.error ?? "調べられませんでした");
      savePasscode(normalizePasscode(passcode));
      const t = data as TermLookup;
      onAdded({
        term: t.term,
        reading: t.reading || undefined,
        category: t.category,
        description: t.description,
        addedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "調べられませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tips" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ margin: 0 }}>「{query.trim()}」を調べて辞典に追加</h2>
      <p className="term-desc" style={{ margin: 0 }}>
        AI が初心者向けの説明を書いて、「自分で追加」に入れます（1回0.1円くらい）。
      </p>
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
      <button type="button" className="btn-primary" onClick={lookup} disabled={busy}>
        {busy ? "調べています…" : "調べて追加する"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default function GlossaryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("すべて");
  const [query, setQuery] = useState("");
  const [myTerms, setMyTerms] = useState<MyTerm[]>([]);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => setMyTerms(loadMyTerms()), []);

  function add(t: MyTerm) {
    // 同じ言葉を調べ直したときは新しい説明に置き換える
    const next = [t, ...myTerms.filter((m) => m.term !== t.term)];
    setMyTerms(next);
    saveMyTerms(next);
    setJustAdded(t.term);
    setQuery(t.term);
    setFilter("すべて");
  }

  function remove(term: string) {
    if (!confirm(`「${term}」を辞典から外しますか？`)) return;
    const next = myTerms.filter((m) => m.term !== term);
    setMyTerms(next);
    saveMyTerms(next);
  }

  const q = query.trim().toLowerCase();
  const all = [...myTerms.map((t) => ({ ...t, mine: true })), ...TERMS.map((t) => ({ ...t, mine: false }))];
  const terms = all.filter(
    (t) =>
      (filter === "すべて" || (filter === "自分で追加" ? t.mine : t.category === filter)) &&
      (!q || [t.term, t.reading ?? "", t.description].some((s) => s.toLowerCase().includes(q))),
  );
  // 言葉そのものが辞典にないときだけ、調べて足すボタンを出す
  const exact = all.some((t) => t.term.toLowerCase() === q || t.reading === q);

  return (
    <>
      <header className="page-header">
        <h1>辞典</h1>
      </header>
      <div className="content" style={{ paddingBottom: 12 }}>
        <label htmlFor="g-search" className="visually-hidden">
          用語を検索
        </label>
        <input
          id="g-search"
          type="search"
          className="input"
          placeholder="用語を検索（なければ調べて追加できます）"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setJustAdded(null);
          }}
        />
        <div className="scroll-row">
          {FILTERS.filter((c) => c !== "自分で追加" || myTerms.length > 0).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <main className="content" style={{ gap: 10 }}>
        {!q && filter === "すべて" && <DailyQuiz />}
        {!q && (filter === "すべて" || filter === "飲み方") && (
          <section className="tips">
            <h2>選び方の目安</h2>
            <ul>
              {CHOOSING_TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}
        {q && !exact && <AddTerm key={q} query={query} onAdded={add} />}
        {terms.map((t) => (
          <article
            key={`${t.mine}-${t.term}`}
            className="card"
            style={{ gap: 4, padding: "12px 16px", outline: justAdded === t.term ? "2px solid var(--accent)" : undefined }}
          >
            <div className="card-top">
              <h3 style={{ fontSize: 15 }}>
                {t.term}
                {t.reading && <span className="muted">（{t.reading}）</span>}
              </h3>
              <span className="muted" style={{ fontSize: 11 }}>
                {t.mine ? `自分で追加・${t.category}` : t.category}
              </span>
            </div>
            <p className="term-desc">{t.description}</p>
            {t.mine && (
              <button
                type="button"
                className="btn-ghost"
                style={{ height: 32, alignSelf: "flex-end", padding: "0 12px", fontSize: 12 }}
                onClick={() => remove(t.term)}
              >
                辞典から外す
              </button>
            )}
          </article>
        ))}
        {terms.length === 0 && !q && <p className="empty">まだありません。</p>}
      </main>
    </>
  );
}
