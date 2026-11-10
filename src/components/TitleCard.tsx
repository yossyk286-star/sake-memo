"use client";

import Medal, { plateStyle } from "./Medal";
import { badgesOf, TITLES, WORDS } from "@/lib/appeal";
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
        <Medal tier={title.tier} size={76} />
        <div>
          <span className="muted">{tr("いまの称号")}</span>
          <strong className="title-plate" style={plateStyle(title.tier)}>{tr(title.name ?? "")}</strong>
          <div className="title-bar" aria-hidden="true">
            <div style={{ width: `${Math.round(title.progress * 100)}%` }} />
          </div>
          <span className="muted">
            {title.next ? tr("「{0}」まで あと{1}{2}", title.next.name, title.next.left, WORDS.cup) : tr("いちばん上の称号です")}
          </span>
        </div>
      </div>
      <ol className="title-ladder" aria-label={tr("称号の段")}>
        {TITLES.map((t, i) => (
          <li key={t.name} data-now={i === title.tier}>
            <Medal tier={i} size={36} locked={i > title.tier} />
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
            {done.slice(-5).map((b) => b.icon).join(" ")}
          </span>
        </summary>
        <ul className="badge-grid">
          {badges.map((b) => (
            <li key={b.id} data-done={b.done}>
              <span className="badge-icon" aria-hidden="true">
                {b.icon}
              </span>
              <strong>{tr(b.label)}</strong>
              <span className="muted">{b.done ? tr("取りました") : tr(b.how)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
