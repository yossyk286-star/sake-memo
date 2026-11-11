"use client";

import { useMemo, useState } from "react";
import { getLang, tr } from "@/lib/i18n";
import { kindColor } from "./RecordCard";
import type { TastingRecord } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 記録をカレンダーで見る（49）。飲んだ日に種類の色の点、押すとその日の記録を下に出す。
 * renderDay は一覧と同じ「その日の記録」の部品
 */
export default function RecordCalendar({
  records,
  renderDay,
}: {
  records: TastingRecord[];
  renderDay: (day: { date: string; records: TastingRecord[] }, i: number) => React.ReactNode;
}) {
  const latest = records[0]?.date ?? new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(latest.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(latest);
  const byDate = useMemo(() => {
    const m = new Map<string, TastingRecord[]>();
    for (const r of records) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return m;
  }, [records]);

  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1).getDay();
  const days = new Date(y, mo, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const move = (d: number) => {
    const t = new Date(y, mo - 1 + d, 1);
    setMonth(`${t.getFullYear()}-${pad(t.getMonth() + 1)}`);
  };
  const en = getLang() === "en";
  const title = en ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : tr("{0}年{1}月", y, mo);
  const week = en ? ["S", "M", "T", "W", "T", "F", "S"] : [..."日月火水木金土"];
  const count = [...byDate.keys()].filter((d) => d.startsWith(month)).reduce((n, d) => n + byDate.get(d)!.length, 0);
  const todayStr = new Date().toLocaleDateString("sv-SE");

  return (
    <>
      <section className="card cal" aria-label={tr("カレンダー")}>
        <div className="cal-head">
          <button type="button" className="cal-nav" aria-label={tr("前の月")} onClick={() => move(-1)}>
            ‹
          </button>
          <strong>
            {title}
            <small className="muted">{tr("{0}杯", count)}</small>
          </strong>
          <button type="button" className="cal-nav" aria-label={tr("次の月")} onClick={() => move(1)}>
            ›
          </button>
        </div>
        <div className="cal-grid" role="grid">
          {week.map((w, i) => (
            <span key={i} className="cal-week" aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const date = `${month}-${pad(d)}`;
            const rs = byDate.get(date) ?? [];
            return (
              <button
                key={date}
                type="button"
                className="cal-day"
                data-has={rs.length ? "" : undefined}
                data-today={date === todayStr ? "" : undefined}
                aria-pressed={picked === date}
                aria-label={rs.length ? tr("{0}日 {1}杯", d, rs.length) : tr("{0}日", d)}
                disabled={!rs.length}
                onClick={() => setPicked(date)}
              >
                {d}
                {rs.length > 0 && (
                  <span className="cal-dots" aria-hidden="true">
                    {rs.slice(0, 3).map((r) => (
                      <i key={r.id} style={{ background: kindColor(r.kind) }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {picked && byDate.get(picked) && renderDay({ date: picked, records: byDate.get(picked)! }, 0)}
    </>
  );
}
