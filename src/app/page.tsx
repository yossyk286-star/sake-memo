"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import GenreSortBar from "@/components/GenreSortBar";
import SearchField from "@/components/SearchField";
import Hint from "@/components/Hint";
import SwipeRecord from "@/components/SwipeRecord";
import { listRecords } from "@/lib/db";
import { genreOf, sortBy, type Genre, type SortKey } from "@/lib/genre";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { getLang, tr } from "@/lib/i18n";
import { dayTotal } from "@/lib/dayTotal";
import BackupNudge from "@/components/BackupNudge";
import MonthRecap from "@/components/MonthRecap";
import { drinkTitle } from "@/components/RecordCard";
import NumText from "@/components/NumText";

const WEEKDAYS = "日月火水木金土";

/** 「2026-10-25」→「10月25日（日）」。今年以外は年も出す */
function dateHead(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const thisYear = y === new Date().getFullYear();
  if (getLang() === "en")
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: thisYear ? undefined : "numeric" });
  const md = tr("{0}月{1}日（{2}）", m, d, w);
  return thisYear ? md : tr("{0}年{1}", y, md);
}

/** 「2026-10」→「10月」。今年以外は年も出す */
function monthHead(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (getLang() === "en")
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: y === new Date().getFullYear() ? undefined : "numeric" });
  return y === new Date().getFullYear() ? tr("{0}月", m) : tr("{0}年{1}月", y, m);
}

export default function RecordsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [goodOnly, setGoodOnly] = useState(false);

  // 閉じている月の中身は、画面が出て落ち着いてから作る（タブを移った瞬間に全部の記録を作ると、かくっと止まる）
  const [allMonths, setAllMonths] = useState(false);

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);
  useEffect(() => {
    if (!records || allMonths) return;
    const t = window.setTimeout(() => startTransition(() => setAllMonths(true)), 450);
    return () => window.clearTimeout(t);
  }, [records, allMonths]);

  // ジャンル・★4以上・名前などで絞り込み、日付ごとにまとめる（記録は新しい順に並んでいる）
  // 甘口・辛口などで並び替えたときは、日付で区切らず1つにまとめる
  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (records ?? []).filter(
      (r) =>
        (!genre || genreOf(r) === genre) &&
        (!goodOnly || r.overall >= 4) &&
        (!q ||
          [
            r.name,
            r.maker,
            r.shop,
            r.origin,
            r.style ?? "",
            r.memo,
            ...r.flavors,
          ].some((s) => s.toLowerCase().includes(q))),
    );
    if (sort !== "default") {
      const sorted = sortBy(hit, sort, (r) => ({
        sweetness: r.sweetness,
        abv: r.abv ?? null,
        rating: r.overall,
      }));
      return sorted.length ? [{ date: "", records: sorted }] : [];
    }
    const out: { date: string; records: TastingRecord[] }[] = [];
    for (const r of hit) {
      const last = out[out.length - 1];
      if (last?.date === r.date) last.records.push(r);
      else out.push({ date: r.date, records: [r] });
    }
    return out;
  }, [records, query, genre, goodOnly, sort]);

  const filtering = !!query.trim() || !!genre || goodOnly;

  // 日付順のときは月ごとにまとめ、いちばん新しい月だけ開いておく（絞り込み・並べ替え中は全部見せる）
  const months = useMemo(() => {
    const out: { month: string; days: typeof days; count: number }[] = [];
    for (const d of days) {
      const m = d.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last?.month === m) {
        last.days.push(d);
        last.count += d.records.length;
      } else out.push({ month: m, days: [d], count: d.records.length });
    }
    return out;
  }, [days]);
  const foldMonths = !filtering && sort === "default" && months.length > 1;
  const genresUsed = useMemo(
    () => [...new Set((records ?? []).map(genreOf))],
    [records],
  );

  const renderDay = (day: (typeof days)[number]) => (
          <section key={day.date} className="day">
            {day.date && (
              <h2 className="date-head">
                {dateHead(day.date)}
                {/* 絞り込み中は一部の記録だけになるので、その日の合計は出さない */}
                {!filtering && <span className="date-total"><NumText text={dayTotal(day.records)} /></span>}
              </h2>
            )}
            <div className="list-group">
              {day.records.map((r) => (
                <SwipeRecord
                  key={r.id}
                  record={r}
                  showDate={!day.date}
                  onDeleted={(id) =>
                    setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)
                  }
                />
              ))}
            </div>
          </section>
  );

  return (
    <>
      <header className="page-header">
        <h1>{tr("さけメモ")}</h1>
        <Link href="/settings" className="icon-btn" data-tour="settings" aria-label={tr("設定")}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </header>

      {records && records.length > 0 && (
        <p className="lead">
          {tr("これまでの記録 {0}件", records.length)}
        </p>
      )}
      {records && records.length > 0 && (
        <Hint id="home-swipe" className="lead">
          {tr("記録を左にスライドすると削除、右にスライドすると編集できます。")}
        </Hint>
      )}

      <main className="content" style={{ paddingBottom: 96 }}>
        {records && <MonthRecap records={records} titleOf={drinkTitle} />}
        {records && <BackupNudge count={records.length} />}
        {records && records.length > 0 && (
          <div className="filter-bar">
            <label htmlFor="r-search" className="visually-hidden">
              {tr("記録を検索")}
            </label>
            <GenreSortBar
              search={
                <SearchField id="r-search" name="records" placeholder={tr("名前・店・味で探す")} value={query} onChange={setQuery} />
              }
              genres={genresUsed}
              genre={genre}
              onGenre={setGenre}
              sort={sort}
              onSort={setSort}
              sorts={["sweet", "dry", "rating", "abvLow", "abvHigh"]}
              defaultLabel={tr("日付順")}
              extra={
                <button
                  type="button"
                  className="chip"
                  aria-pressed={goodOnly}
                  onClick={() => setGoodOnly(!goodOnly)}
                >
                  {tr("★4以上")}
                </button>
              }
            />
          </div>
        )}
        {records?.length === 0 && (
          <EmptyState
            title={tr("最初の1杯、いっしょに記録しよう")}
            actions={[
              { href: "/new", label: tr("1杯目を記録する") },
              { href: "/scan", label: tr("メニューを撮って選ぶ") },
            ]}
          >
            {tr("飲んだお酒を残していくと、好みや産地のスタンプがたまっていくよ。")}
          </EmptyState>
        )}
        {records && records.length > 0 && filtering && days.length === 0 && (
          <p className="empty">{tr("当てはまる記録がありません。")}</p>
        )}
        {foldMonths
          ? months.map((m, i) => (
              <details
                key={m.month}
                className="month-fold"
                open={i === 0}
                onToggle={(e) => e.currentTarget.open && !allMonths && setAllMonths(true)}
              >
                <summary>
                  <span>{monthHead(m.month)}</span>
                  <span className="month-fold-count">{tr("{0}杯", m.count)}</span>
                </summary>
                <div className="month-body">{(i === 0 || allMonths) && m.days.map(renderDay)}</div>
              </details>
            ))
          : days.map(renderDay)}
      </main>

      <Link href="/new" className="fab" data-tour="fab">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {tr("記録する")}
      </Link>
    </>
  );
}
