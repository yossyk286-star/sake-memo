"use client";

import BadgeMedal from "./BadgeMedal";
import { plateStyle, TitleMedal } from "./Medal";
import { APP, badgesOf, TITLES, WORDS } from "@/lib/appeal";
import { tr } from "@/lib/i18n";
import { titleOf } from "@/lib/milestones";
import type { TastingRecord } from "@/lib/types";

/** 好み画面のいちばん上。いまの称号・次までの残りと、あつめたしるし（押すと全部） */
export default function TitleCard({ records }: { records: TastingRecord[] }) {
  if (records.length === 0) return null;
  const title = titleOf(records.length);
  const badges = badgesOf(records);
  const done = badges.filter((b) => b.done);
  const plat = done.filter((b) => b.plat?.done).length;
  return (
    <section className="card title-card" aria-label={tr("称号としるし")}>
      <div className="title-now">
        <TitleMedal tier={title.tier} emblem={APP.emblem} size={72} />
        <div>
          <span className="muted">{tr("いまの称号")}</span>
          <strong className="title-plate" style={plateStyle(title.tier)}>
            {tr(title.name ?? "")}
          </strong>
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
            <TitleMedal tier={i} emblem={APP.emblem} size={34} locked={i > title.tier} />
            <span>{tr(t.name)}</span>
            <span>{tr("{0}{1}〜", t.at, WORDS.cup)}</span>
          </li>
        ))}
      </ol>
      <details className="badges">
        <summary>
          <span>
            {tr("あつめたしるし")} <span className="muted">{done.length} / {badges.length}</span>
            {plat > 0 && <span className="muted badge-plat-count">{tr("プラチナ {0}", plat)}</span>}
          </span>
          <span className="badge-peek" aria-hidden="true">
            {done.slice(-4).map((b) => (
              <BadgeMedal key={b.id} badge={b} size={24} />
            ))}
          </span>
        </summary>
        <ul className="badge-grid">
          {badges.map((b) => (
            <li key={b.id} data-done={b.done} data-plat={b.done && b.plat?.done ? "" : undefined} title={b.done && b.plat && !b.plat.done ? tr(b.plat.how) : undefined}>
              <BadgeMedal badge={b} size={58} />
              <strong>{tr(b.label)}</strong>
              <span className="muted">
                {!b.done ? tr(b.how) : !b.plat ? tr("取りました") : b.plat.done ? tr("プラチナ") : tr("あと{0}{1}でプラチナ", b.plat.left, tr(b.plat.unit))}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
