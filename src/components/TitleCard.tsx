"use client";

import BadgeMedal from "./BadgeMedal";
import { plateStyle, TitleMedal } from "./Medal";
import { APP, badgesOf, TITLES, TOP_LINES, WORDS } from "@/lib/appeal";
import { tr } from "@/lib/i18n";
import { titleOf } from "@/lib/milestones";
import type { TastingRecord } from "@/lib/types";

/** 好み画面のいちばん上。いまの称号・次までの残りと、あつめたしるし（押すと全部） */
export default function TitleCard({ records }: { records: TastingRecord[] }) {
  if (records.length === 0) return null;
  const title = titleOf(records.length);
  const badges = badgesOf(records);
  const done = badges.filter((b) => b.done);
  return (
    <section className="card title-card" aria-label={tr("称号としるし")}>
      <div className="title-now">
        <TitleMedal tier={title.tier} emblem={APP.emblem} size={72} />
        <div>
          <span className="muted">{tr("いまの称号")}</span>
          <strong className="title-plate" style={plateStyle(title.tier)}>
            {tr(title.name ?? "")}
          </strong>
          {title.quip && <span className="title-quip">{tr(title.quip)}</span>}
          <div className="title-bar" aria-hidden="true">
            <div style={{ width: `${Math.round(title.progress * 100)}%` }} />
          </div>
          <span className="muted">
            {title.next ? tr(title.next.left <= 2 ? "「{0}」まで あと{1}{2}。もう目の前！" : "「{0}」まで あと{1}{2}。のんびりいこう", title.next.name, title.next.left, WORDS.cup) : tr(TOP_LINES.title)}
          </span>
        </div>
      </div>
      <ol className="title-ladder" aria-label={tr("称号の段")}>
        {TITLES.map((t, i) => (
          <li key={t.name} data-now={i === title.tier}>
            <TitleMedal tier={i} emblem={APP.emblem} size={32} locked={i > title.tier} />
            <span>{tr(t.name)}</span>
            <span>{tr("{0}{1}〜", t.at, WORDS.cup)}</span>
          </li>
        ))}
      </ol>
      <details className="badges">
        <summary>
          <span>
            {tr("あつめたしるし")} <span className="muted">{done.length} / {badges.length}</span>
          </span>
          <span className="badge-peek" aria-hidden="true">
            {done.slice(-4).map((b) => (
              <BadgeMedal key={b.id} badge={b} size={24} />
            ))}
          </span>
        </summary>
        <ul className="badge-grid">
          {badges.map((b) => (
            <li key={b.id} data-done={b.done} data-tier={b.done ? b.tier : undefined}>
              <BadgeMedal badge={b} size={58} />
              <strong>{tr(b.label)}</strong>
              <span className="muted">
                {!b.next ? tr(TOP_LINES.badge) : !b.done ? tr(b.next.how, b.next.need, b.next.arg) : tr(b.next.left === 1 ? "あと{0}{1}！" : "次まで あと{0}{1}", b.next.left, tr(b.next.unit))}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
