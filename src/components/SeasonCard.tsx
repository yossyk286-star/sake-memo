"use client";

import { seasonNow } from "@/lib/season";
import { tr } from "@/lib/i18n";

/** 調べる画面の上の「いまが旬」カード。ボタンを押すと、その名前ですぐ調べる（7） */
export default function SeasonCard({ onPick }: { onPick: (query: string) => void }) {
  const { month, season, args } = seasonNow();
  return (
    <section className="card season-card" aria-label={tr("いまが旬")}>
      <span className="season-eyebrow">{tr("いまが旬・{0}月", month)}</span>
      <h2>{tr(season.title)}</h2>
      <p className="muted">{tr(season.body, ...args)}</p>
      <div className="season-actions">
        {season.queries.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => onPick(q)}>
            {tr("{0}を調べる", q)}
          </button>
        ))}
      </div>
    </section>
  );
}
