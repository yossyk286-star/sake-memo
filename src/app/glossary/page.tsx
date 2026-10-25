"use client";

import { useState } from "react";
import DailyQuiz from "@/components/DailyQuiz";
import { CHOOSING_TIPS, TERMS, type GlossaryCategory } from "@/lib/glossary";

const CATEGORIES: ("すべて" | GlossaryCategory)[] = [
  "すべて",
  "日本酒",
  "ワイン",
  "ビール",
  "ウイスキー",
  "焼酎",
  "その他",
  "飲み方",
  "味の表現",
];

export default function GlossaryPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("すべて");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const terms = TERMS.filter(
    (t) =>
      (category === "すべて" || t.category === category) &&
      (!q || [t.term, t.reading ?? "", t.description].some((s) => s.toLowerCase().includes(q))),
  );

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
          placeholder="用語を検索（例：吟醸）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="scroll-row">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <main className="content" style={{ gap: 10 }}>
        {!q && category === "すべて" && <DailyQuiz />}
        {!q && (category === "すべて" || category === "飲み方") && (
          <section className="tips">
            <h2>選び方の目安</h2>
            <ul>
              {CHOOSING_TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}
        {terms.map((t) => (
          <article key={t.term} className="card" style={{ gap: 4, padding: "12px 16px" }}>
            <div className="card-top">
              <h3 style={{ fontSize: 15 }}>
                {t.term}
                {t.reading && <span className="muted">（{t.reading}）</span>}
              </h3>
              <span className="muted" style={{ fontSize: 11 }}>
                {t.category}
              </span>
            </div>
            <p className="term-desc">{t.description}</p>
          </article>
        ))}
        {terms.length === 0 && <p className="empty">「{query}」に当てはまる用語はありません。</p>}
      </main>
    </>
  );
}
