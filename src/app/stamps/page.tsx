"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { collectStamps, diaryNote, REGIONS, travelDiary, type DiaryEntry, type Stamp } from "@/lib/origins";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";

function StampCell({
  name,
  stamp,
  open,
  onToggle,
  pop,
}: {
  name: string;
  stamp?: Stamp;
  open: boolean;
  onToggle: () => void;
  /** 新しく増えたスタンプは、ポンと押す */
  pop?: boolean;
}) {
  const delay = usePressDelay(pop);
  if (!stamp) {
    return (
      <div className="stamp" aria-label={`${name} まだ`}>
        <span className="stamp-name">{name}</span>
      </div>
    );
  }
  // 飲んだ産地はタップで、そこのどのお酒を飲んだかを開く
  return (
    <button
      type="button"
      ref={delay.ref}
      className={!pop ? "stamp stamp-on" : delay.value === null ? "stamp stamp-on stamp-wait" : "stamp stamp-on stamp-pop"}
      style={delay.value === null ? undefined : { animationDelay: `${delay.value}s` }}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="stamp-name">{name}</span>
      <span className="stamp-meta">
        {stamp.count}杯・最高★{stamp.best}
      </span>
    </button>
  );
}

// 同じころに見えたスタンプは、少しずつずらして順番に押す
let lastPress = 0;
let pressedInRow = 0;

/** 画面に見えたときに押す。下のほうの新しいスタンプも、スクロールして見えたところで押される */
function usePressDelay<T extends HTMLElement = HTMLButtonElement>(pop?: boolean) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!pop || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const now = Date.now();
        pressedInRow = now - lastPress < 500 ? pressedInRow + 1 : 0;
        lastPress = now;
        setValue(0.25 + Math.min(pressedInRow, 10) * 0.12);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pop]);
  return { ref, value };
}

/** その産地で飲んだお酒。評価の高い順 */
function StampDetail({ name, stamp }: { name: string; stamp: Stamp }) {
  const rows = [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date));
  return (
    <div className="stamp-detail">
      <h3>{name}で飲んだお酒</h3>
      {rows.map((r) => (
        <Link key={r.id} href={`/record?id=${r.id}`} className="stamp-row">
          <span className="stamp-row-name">{drinkTitle(r)}</span>
          <span className="stars">{stars(r.overall)}</span>
          <span className="muted stamp-row-sub">
            {r.shop}・{r.date.slice(5).replace("-", "/")}
            {r.kind ? `・${r.kind}` : ""}
            {r.style ? `・${r.style}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** 旅日記の1日。左にハンコ、右に日付とそこで初めて飲んだお酒とひとこと */
function DiaryDay({ entry, nth, pop }: { entry: DiaryEntry; nth: number; pop?: boolean }) {
  const delay = usePressDelay<HTMLSpanElement>(pop);
  const r = entry.first;
  const note = diaryNote(r);
  const [, m, d] = r.date.split("-").map(Number);
  // リスト外の産地は産地欄のままなので、ハンコに入る長さに切る
  const label = entry.place.length > 8 ? `${entry.place.slice(0, 7)}…` : entry.place;
  return (
    <li className="diary-day">
      <span
        ref={delay.ref}
        className={!pop ? "diary-stamp" : delay.value === null ? "diary-stamp stamp-wait" : "diary-stamp stamp-pop"}
        style={delay.value === null ? undefined : { animationDelay: `${delay.value}s` }}
        data-long={label.length > 3 || undefined}
        aria-hidden
      >
        {label.length < 5 ? (
          label
        ) : (
          // 長い名前は半分ずつ2行にする（「エチオピ／ア」のように1文字だけ落ちないように）
          <>
            {label.slice(0, Math.ceil(label.length / 2))}
            <br />
            {label.slice(Math.ceil(label.length / 2))}
          </>
        )}
      </span>
      <Link href={`/record?id=${r.id}`} className="diary-body">
        <span className="diary-date">
          {m}月{d}日<span className="muted">・{nth}か所目</span>
        </span>
        <span className="diary-title">
          {entry.place}で {drinkTitle(r)}
        </span>
        {note && <span className={note.quote ? "diary-note quote" : "diary-note"}>{note.text}</span>}
        <span className="muted diary-sub">
          {[r.shop, r.kind, entry.count > 1 ? `ここで${entry.count}杯` : null].filter(Boolean).join("・")}
        </span>
      </Link>
    </li>
  );
}

/** 産地を初めて飲んだ日の順に。年ごとに区切って、日本一周・世界一周の旅のように読む */
function Diary({ entries, popOf }: { entries: DiaryEntry[]; popOf: (name: string) => boolean }) {
  if (entries.length === 0) {
    return (
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          産地の入った記録をつけると、ここに旅の記録が並びます。最初の一歩はどこから？
        </p>
      </section>
    );
  }
  const first = entries[0].first.date;
  const japan = entries.filter((e) => e.japan).length;
  const years = [...new Set(entries.map((e) => e.first.date.slice(0, 4)))];
  return (
    <>
      <section className="card diary-summary">
        <div>
          <span className="muted">旅のはじまり</span>
          <strong>{first.split("-").map(Number).join(".")}</strong>
          <span className="muted">{entries[0].place}から</span>
        </div>
        <div>
          <span className="muted">日本一周</span>
          <strong>
            {japan}
            <small> / 47</small>
          </strong>
          <span className="muted">あと{47 - japan}県</span>
        </div>
        <div>
          <span className="muted">海外など</span>
          <strong>{entries.length - japan}</strong>
          <span className="muted">か所</span>
        </div>
      </section>
      {years.map((y) => (
        <section key={y} className="card" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 15 }}>{y}年</h2>
          <ol className="diary">
            {entries.map((e, i) =>
              e.first.date.startsWith(y) ? <DiaryDay key={e.place} entry={e} nth={i + 1} pop={popOf(e.place)} /> : null,
            )}
          </ol>
        </section>
      ))}
      <p className="lead" style={{ textAlign: "center" }}>
        つづく…
      </p>
    </>
  );
}

type View = "スタンプ帳" | "旅日記";
const VIEW_KEY = "sake-memo:stamps-view";

const SEEN_KEY = "sake-memo:stamps-seen";

/** 前に開いたときから増えた産地。見たものとして覚えておく */
function takeNewStamps(names: string[]): string[] {
  try {
    const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
    localStorage.setItem(SEEN_KEY, JSON.stringify(names));
    return names.filter((n) => !seen.has(n));
  } catch {
    return [];
  }
}

/** 飲んだ産地がスタンプのように埋まっていく。まだの産地は次に試すヒントになる */
export default function StampsPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const toggle = (name: string) => setOpened((o) => (o === name ? null : name));
  const [view, setView] = useState<View>("スタンプ帳");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "旅日記") setView("旅日記");
    } catch {}
  }, []);
  const pick = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  useEffect(() => {
    listRecords().then(setRecords);
  }, []);

  const { stamps, others, total } = useMemo(() => collectStamps(records ?? []), [records]);
  const diary = useMemo(() => travelDiary(stamps, others), [stamps, others]);

  // 新しいスタンプは、ページを開いたときにポンと押す演出をする
  const [fresh, setFresh] = useState<string[]>([]);
  const counted = useRef(false);
  useEffect(() => {
    if (!records || counted.current) return;
    counted.current = true;
    // 画面の並び順（上から）で押していく
    const shown = REGIONS.flatMap((r) => r.places.map((c) => c.name)).filter((n) => stamps.has(n));
    setFresh(takeNewStamps([...shown, ...others.keys()]));
  }, [records, stamps, others]);
  const popOf = (name: string) => fresh.includes(name);

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>産地スタンプ帳</h1>
      </header>

      <p className="lead">
        47都道府県と海外{total - 47}カ国のうち <strong>{stamps.size}か所</strong> 制覇。
        {view === "スタンプ帳"
          ? "色の付いた産地を押すと、飲んだお酒が見られます。"
          : "初めて飲んだ日の順に、旅のように並べました。"}
      </p>

      <div className="mode-switch stamps-switch" role="group" aria-label="見かた">
        {(["スタンプ帳", "旅日記"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}>
            {v}
          </button>
        ))}
      </div>

      {fresh.length > 0 && (
        <p className="stamp-news" role="status">
          新しいスタンプ：{fresh.slice(0, 5).join("・")}
          {fresh.length > 5 ? ` ほか${fresh.length - 5}か所` : ""}
        </p>
      )}

      <main className="content">
        {view === "旅日記" && records && <Diary entries={diary} popOf={popOf} />}
        {view === "スタンプ帳" && REGIONS.map((r) => {
          const done = r.places.filter((c) => stamps.has(c.name)).length;
          return (
            <section key={r.region} className="card" style={{ gap: 12 }}>
              <div className="card-top">
                <h2 style={{ fontSize: 15 }}>{r.region}</h2>
                <span className="muted">
                  {done} / {r.places.length}
                </span>
              </div>
              <div className="stamp-grid">
                {r.places.map((c) => (
                  <StampCell
                    key={c.name}
                    name={c.name}
                    stamp={stamps.get(c.name)}
                    open={opened === c.name}
                    onToggle={() => toggle(c.name)}
                    pop={popOf(c.name)}
                  />
                ))}
              </div>
              {opened && r.places.some((c) => c.name === opened) && stamps.get(opened) && (
                <StampDetail name={opened} stamp={stamps.get(opened)!} />
              )}
            </section>
          );
        })}
        {view === "スタンプ帳" && others.size > 0 && (
          <section className="card" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 15 }}>そのほかの産地</h2>
            <div className="stamp-grid">
              {[...others].map(([name, s]) => (
                <StampCell
                  key={name}
                  name={name}
                  stamp={s}
                  open={opened === name}
                  onToggle={() => toggle(name)}
                  pop={popOf(name)}
                />
              ))}
            </div>
            {opened && others.get(opened) && <StampDetail name={opened} stamp={others.get(opened)!} />}
          </section>
        )}
      </main>
    </>
  );
}
