"use client";

import LineIcon from "@/components/LineIcon";
import { clientReady } from "@/lib/pageSwap";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import GenreSortBar from "@/components/GenreSortBar";
import SearchField from "@/components/SearchField";
import Hint from "@/components/Hint";
import SwipeRecord from "@/components/SwipeRecord";
import { deleteManyWithUndo, listRecords, peekRecords, putRecord, RECORDS_EVENT } from "@/lib/db";
import RecordCard from "@/components/RecordCard";
import { askConfirm } from "@/components/ConfirmSheet";
import { shareRecords } from "@/lib/recordShare";
import { toast } from "@/lib/toast";
import { cleanTag, tagsUsed } from "@/lib/quickPick";
import { LATER_EVENT, loadLater } from "@/lib/later";
import YearRecapCard from "@/components/YearRecapCard";
import { genreOf, sortBy, type Genre, type SortKey } from "@/lib/genre";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { getLang, tr } from "@/lib/i18n";
import { dayTotal } from "@/lib/dayTotal";
import BackupNudge from "@/components/BackupNudge";
import MonthRecap from "@/components/MonthRecap";
import { drinkTitle } from "@/components/RecordCard";
import NumText from "@/components/NumText";
import MomentCard from "@/components/MomentCard";
import ShopCapsule from "@/components/ShopCapsule";
import RecordCalendar from "@/components/RecordCalendar";
import { reducedMotion, useFeatures } from "@/lib/features";

const WEEKDAYS = "日月火水木金土";
const VIEW_KEY = "sake-memo:list-view";

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

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY);
  } catch {
    return null;
  }
}

export default function RecordsPage() {
  // 前に開いたときに読んだ一覧があれば、それですぐ描く（読み直しは下で）
  const [records, setRecords] = useState<TastingRecord[] | null>(peekRecords);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [goodOnly, setGoodOnly] = useState(false);
  const [againOnly, setAgainOnly] = useState(false);
  // 自分のタグで絞り込み（11）。詳細のタグを押したときは ?tag= で来る
  const [tag, setTag] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tag");
    if (t) setTag(t);
  }, []);
  // 「選ぶ」でまとめて操作（57）
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [tagging, setTagging] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  // あとで書く箱の数（41）
  const [later, setLater] = useState(0);
  useEffect(() => {
    const count = () => loadLater().then((l) => setLater(l.length));
    count();
    window.addEventListener(LATER_EVENT, count);
    return () => window.removeEventListener(LATER_EVENT, count);
  }, []);
  const [view, setView] = useState<"list" | "cal">(() => (clientReady && readView() === "cal" ? "cal" : "list"));
  useEffect(() => {
    try {
      if (readView() === "cal") setView("cal");
    } catch {}
  }, []);
  function pickView(v: "list" | "cal") {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  // 閉じている月の中身は、画面が出て落ち着いてから作る（タブを移った瞬間に全部の記録を作ると、かくっと止まる）
  const [allMonths, setAllMonths] = useState(false);

  useEffect(() => {
    const load = () => listRecords().then(setRecords);
    load();
    // 消したあと「元に戻す」を押したら読み直す
    window.addEventListener(RECORDS_EVENT, load);
    return () => window.removeEventListener(RECORDS_EVENT, load);
  }, []);
  useEffect(() => {
    if (!records || allMonths) return;
    const t = window.setTimeout(() => startTransition(() => setAllMonths(true)), 450);
    return () => window.clearTimeout(t);
  }, [records, allMonths]);
  const features = useFeatures();
  // 一覧を順に浮かせるのは、詳細から戻ってきたとき（行へ縮んで帰る動き）以外（24）
  const [stagger, setStagger] = useState(false);
  // タブで戻ってきたとき（覚えた一覧ですぐ描けたとき）は浮かせない。毎回だと読み込み中に見える
  const [fresh] = useState(() => !peekRecords());
  useEffect(() => setStagger(fresh && !document.documentElement.dataset.vt), [fresh]);
  // 下へスクロールしたら「記録する」を丸く縮める（26）。上へ戻すと元に戻す
  const [mini, setMini] = useState(false);
  // 検索欄が画面の上へ消えたら、右下の「記録する」の左に虫めがねを浮かせる（19）
  const [searchGone, setSearchGone] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      if (y < 40) setMini(false);
      else if (d > 8) setMini(true);
      else if (d < -8) setMini(false);
      else return;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const bar = document.querySelector(".filter-bar");
    if (!bar) return;
    const io = new IntersectionObserver(([e]) => setSearchGone(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(bar);
    return () => io.disconnect();
  }, [records]);
  function jumpToSearch() {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    // スクロールが終わってから入力欄を開く（iPhone はすぐにキーボードを出せる）
    document.getElementById("r-search")?.focus({ preventScroll: true });
  }

  // ジャンル・★4以上・名前などで絞り込み、日付ごとにまとめる（記録は新しい順に並んでいる）
  // 甘口・辛口などで並び替えたときは、日付で区切らず1つにまとめる
  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (records ?? []).filter(
      (r) =>
        (!genre || genreOf(r) === genre) &&
        (!goodOnly || r.overall >= 4) &&
        (!againOnly || !!r.again) &&
        (!tag || !!r.tags?.includes(tag)) &&
        (!q ||
          [
            r.name,
            r.maker,
            r.shop,
            r.origin,
            r.style ?? "",
            r.memo,
            r.reading ?? "",
            ...r.flavors,
            ...(r.tags ?? []).map((t) => `#${t}`),
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
  }, [records, query, genre, goodOnly, againOnly, tag, sort]);

  const filtering = !!query.trim() || !!genre || goodOnly || againOnly || !!tag;
  const tagsHere = useMemo(() => tagsUsed(records ?? []), [records]);
  const pickedRecords = (records ?? []).filter((r) => picked.includes(r.id));
  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  // 選んでいる間はタブを隠し、その場所に操作ボタンを出す（57）
  useEffect(() => {
    const el = document.documentElement;
    if (selecting) el.dataset.selecting = "";
    else delete el.dataset.selecting;
    return () => {
      delete el.dataset.selecting;
    };
  }, [selecting]);
  function endSelect() {
    setSelecting(false);
    setPicked([]);
    setTagging(false);
  }
  async function bulkDelete() {
    const n = pickedRecords.length;
    if (!n) return;
    const ok = await askConfirm({
      message: tr("{0} の{1}件を消します", pickedRecords.slice(0, 3).map((r) => drinkTitle(r)).join(tr("・")) + (n > 3 ? tr(" ほか") : ""), n),
      action: tr("{0}件を削除", n),
    });
    if (!ok) return;
    await deleteManyWithUndo(pickedRecords);
    setRecords((rs) => rs?.filter((r) => !picked.includes(r.id)) ?? null);
    endSelect();
  }
  async function bulkAddTag(raw: string) {
    const t = cleanTag(raw);
    if (!t) return;
    const now = Date.now();
    const next = pickedRecords.map((r) => (r.tags?.includes(t) ? r : { ...r, tags: [...(r.tags ?? []), t], updatedAt: now }));
    for (const r of next) await putRecord(r);
    setRecords((rs) => rs?.map((r) => next.find((x) => x.id === r.id) ?? r) ?? null);
    toast(tr("{0}件に #{1} を付けました", next.length, t));
    setBulkTag("");
    setTagging(false);
  }
  // 同じ名前のお酒の何回目か（古い順に数える）（43）
  const nthOf = useMemo(() => {
    const seen = new Map<string, number>();
    const out = new Map<string, number>();
    for (const r of [...(records ?? [])].reverse()) {
      const k = r.name.trim().normalize("NFKC").toLowerCase();
      if (!k) continue;
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      out.set(r.id, n);
    }
    return out;
  }, [records]);
  const hasAgain = features.favorites && !!records?.some((r) => r.again);

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

  const renderDay = (day: (typeof days)[number], di: number) => (
          <section key={day.date} className="day" style={{ "--d": Math.min(di, 8) } as React.CSSProperties}>
            {day.date && (
              <h2 className="date-head">
                {dateHead(day.date)}
                {/* 絞り込み中は一部の記録だけになるので、その日の合計は出さない */}
                {!filtering && <span className="date-total"><NumText text={dayTotal(day.records)} /></span>}
              </h2>
            )}
            <div className="list-group">
              {day.records.map((r, i) =>
                selecting ? (
                  <div
                    key={r.id}
                    className={`select-row${picked.includes(r.id) ? " is-on" : ""}`}
                    role="checkbox"
                    aria-checked={picked.includes(r.id)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(r.id))}
                    onClickCapture={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(r.id);
                    }}
                  >
                    <span className="ck" aria-hidden="true">
                      {picked.includes(r.id) && "✓"}
                    </span>
                    <RecordCard record={r} showDate={!day.date} nth={nthOf.get(r.id)} />
                  </div>
                ) : (
                <SwipeRecord
                  key={r.id}
                  index={i}
                  nth={nthOf.get(r.id)}
                  record={r}
                  showDate={!day.date}
                  onDeleted={(id) =>
                    setRecords((rs) => rs?.filter((x) => x.id !== id) ?? null)
                  }
                  onChanged={(n) => setRecords((rs) => rs?.map((x) => (x.id === n.id ? n : x)) ?? null)}
                />
                ),
              )}
            </div>
          </section>
  );

  return (
    <>
      {features.shopCapsule && records && <ShopCapsule records={records} />}
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
        <div className="lead lead-row">
          <span>{selecting ? tr("{0}件 選択", picked.length) : tr("これまでの記録 {0}件", records.length)}</span>
          <button type="button" className="text-btn select-toggle" aria-pressed={selecting} onClick={() => (selecting ? endSelect() : setSelecting(true))}>
            {selecting ? tr("完了") : tr("選ぶ")}
          </button>
          {/* 一覧とカレンダーを切り替える（49） */}
          <div className="view-switch" role="group" aria-label={tr("見せ方")}>
            <button type="button" aria-pressed={view === "list"} aria-label={tr("一覧")} onClick={() => pickView("list")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
            </button>
            <button type="button" aria-pressed={view === "cal"} aria-label={tr("カレンダー")} onClick={() => pickView("cal")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {records && records.length > 0 && (
        <Hint id="home-swipe" className="lead">
          {tr("記録を左にスライドすると削除、右にスライドすると編集できます。")}
        </Hint>
      )}

      <main className={stagger ? "content stagger" : "content"} style={{ paddingBottom: 96 }}>
        {later > 0 && (
          <Link href="/later" className="later-banner">
            <LineIcon name="camera" size={20} />
            <strong>{tr("あとで書く")}</strong>
            <span className="later-count">{tr("{0}件", later)}</span>
            <span aria-hidden="true" className="later-go">›</span>
          </Link>
        )}
        {records && <YearRecapCard records={records} />}
        {records && records.length > 0 && <MomentCard />}
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
                <>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={goodOnly}
                    onClick={() => setGoodOnly(!goodOnly)}
                  >
                    {tr("★4以上")}
                  </button>
                  {hasAgain && (
                    <button type="button" className="chip" aria-pressed={againOnly} onClick={() => setAgainOnly(!againOnly)}>
                      {tr("♥ また飲みたい")}
                    </button>
                  )}
                  {[...new Set([...(tag ? [tag] : []), ...tagsHere.slice(0, 8)])].map((t) => (
                    <button key={t} type="button" className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                      #{t}
                    </button>
                  ))}
                </>
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
          query.trim() ? (
            // 見つからないときは、打った名前のまま次の操作へ（62）
            <section className="empty-next">
              <p>{tr("「{0}」はまだ記録していません", query.trim())}</p>
              <Link href={`/scan?q=${encodeURIComponent(query.trim())}`} className="btn-primary">
                {tr("この名前で調べる")}
              </Link>
              <Link href={`/new?name=${encodeURIComponent(query.trim())}`} className="btn-secondary">
                {tr("この名前で記録する")}
              </Link>
            </section>
          ) : (
            <p className="empty">{tr("当てはまる記録がありません。")}</p>
          )
        )}
        {view === "cal" && records && records.length > 0 && !filtering && sort === "default" ? (
          <RecordCalendar records={records} renderDay={renderDay} />
        ) : foldMonths
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

      {selecting && (
        <div className="bulk-bar" role="toolbar" aria-label={tr("選んだ記録の操作")}>
          {tagging && (
            <form
              className="bulk-tag"
              onSubmit={(e) => {
                e.preventDefault();
                bulkAddTag(bulkTag);
              }}
            >
              <div className="chip-wrap">
                {tagsHere.slice(0, 6).map((t) => (
                  <button key={t} type="button" className="chip" onClick={() => bulkAddTag(t)}>
                    #{t}
                  </button>
                ))}
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input className="input" autoFocus aria-label={tr("付けるタグ")} placeholder={tr("＃ タグ（例：金沢旅行）")} value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} />
                <button type="submit" className="btn-secondary" disabled={!cleanTag(bulkTag)}>
                  {tr("付ける")}
                </button>
              </div>
            </form>
          )}
          <div className="bulk-btns">
            <Link
              href={`/compare?ids=${picked.slice(0, 4).join(",")}`}
              aria-disabled={picked.length < 2}
              className={picked.length < 2 ? "is-off" : undefined}
              onClick={(e) => picked.length < 2 && e.preventDefault()}
            >
              <LineIcon name="compare" size={22} />
              {tr("くらべる")}
            </Link>
            <button type="button" disabled={!picked.length} onClick={() => shareRecords(pickedRecords).catch(() => toast("共有できませんでした", { tone: "warn" }))}>
              <LineIcon name="share" size={22} />
              {tr("画像で送る")}
            </button>
            <button type="button" disabled={!picked.length} aria-pressed={tagging} onClick={() => setTagging(!tagging)}>
              <LineIcon name="tag" size={22} />
              {tr("タグ")}
            </button>
            <button type="button" className="is-danger" disabled={!picked.length} onClick={bulkDelete}>
              <LineIcon name="trash" size={22} />
              {tr("削除")}
            </button>
          </div>
        </div>
      )}
      {searchGone && !selecting && (
        <button type="button" className="float-search" aria-label={tr("記録を検索")} onClick={jumpToSearch}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 20 20" />
          </svg>
        </button>
      )}
      {!selecting && <Link href="/new" className="fab" data-tour="fab" data-mini={mini && features.fabShrink ? "" : undefined} aria-label={tr("記録する")}>
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
        <span className="fab-label">{tr("記録する")}</span>
      </Link>}
    </>
  );
}
