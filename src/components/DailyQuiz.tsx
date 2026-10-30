"use client";

import { useEffect, useState } from "react";
import { today } from "@/lib/lastScan";
import { TERMS } from "@/lib/glossary";
import { loadMyTerms } from "@/lib/myTerms";
import { makeQuestion, type Question } from "@/lib/quiz";
import { tr, trv } from "@/lib/i18n";

const STATS_KEY = "sake-memo:quiz";

type Stats = { solved: number; correct: number };

function loadStats(): Stats {
  try {
    return { solved: 0, correct: 0, ...JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}") };
  } catch {
    return { solved: 0, correct: 0 };
  }
}

/** 辞典の用語から出す1問。日付で問題が決まり、「もう1問」で続けて解ける */
export default function DailyQuiz() {
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ solved: 0, correct: 0 });

  // 日付はブラウザの時計で決めるので、表示後に作る
  useEffect(() => {
    // 自分で辞典に足した言葉も出す
    setQuestion(makeQuestion(`${today()}#${round}`, [...loadMyTerms(), ...TERMS]));
    setChosen(null);
  }, [round]);
  useEffect(() => setStats(loadStats()), []);

  if (!question) return null;

  function choose(i: number) {
    if (chosen !== null || !question) return;
    setChosen(i);
    const next = { solved: stats.solved + 1, correct: stats.correct + (i === question.answer ? 1 : 0) };
    setStats(next);
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {}
  }

  const right = chosen === question.answer;
  return (
    <section className="tips quiz" aria-label={tr("今日の1問")}>
      <div className="card-top">
        <h2>{round === 0 ? tr("今日の1問") : tr("もう1問（{0}問目）", round + 1)}</h2>
        {stats.solved > 0 && (
          <span className="muted" style={{ fontSize: 12 }}>
            {tr("これまで {0}/{1}問正解", stats.correct, stats.solved)}
          </span>
        )}
      </div>
      <p className="term-desc">
        <span className="muted">{trv(question.term.category)}：</span>
        {trv(question.hint)}
      </p>
      <p className="term-desc" style={{ fontWeight: 600 }}>
        {tr("これは何のこと？")}
      </p>
      <div className="quiz-choices">
        {question.choices.map((c, i) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={chosen === i}
            data-result={chosen === null ? undefined : i === question.answer ? "right" : chosen === i ? "wrong" : undefined}
            onClick={() => choose(i)}
          >
            {trv(c)}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <>
          <p className="term-desc" role="status">
            {right ? tr("正解！ ") : tr("ざんねん、正解は「{0}」。 ", question.term.term)}
            {trv(question.term.description)}
          </p>
          <button type="button" className="btn-secondary" onClick={() => setRound((r) => r + 1)}>
            {tr("もう1問")}
          </button>
        </>
      )}
    </section>
  );
}
