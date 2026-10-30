"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { collectStamps, diaryNote, REGIONS, travelDiary, type DiaryEntry, type Stamp } from "@/lib/origins";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { getLang, tr, trJoin, trv } from "@/lib/i18n";

// 地図の形は大きいので、ボタンを押したときに読み込む
const JapanMapSheet = dynamic(() => import("@/components/JapanMapSheet"), { ssr: false });

/** 丸いスタンプに1行で入らない長い名前は、言葉の切れ目（\u200b）でだけ折り返す */
const STAMP_BREAKS: Record<string, string> = {
  "オーストリア": "オースト\u200bリア",
  "スコットランド": "スコット\u200bランド",
  "アイルランド": "アイル\u200bランド",
  "アルゼンチン": "アルゼン\u200bチン",
  "オーストラリア": "オースト\u200bラリア",
  "ニュージーランド": "ニュー\u200bジーランド",
  "南アフリカ": "南\u200bアフリカ",
};

function StampName({ name }: { name: string }) {
  return (
    <span className={(getLang() === "en" ? tr(name).length >= 7 : name.length >= 5) ? "stamp-name stamp-name-long" : "stamp-name"}>{getLang() === "en" ? tr(name) : (STAMP_BREAKS[name] ?? name)}</span>
  );
}

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
      <div className="stamp" aria-label={tr("{0} まだ", name)}>
        <StampName name={name} />
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
      <StampName name={name} />
      <span className="stamp-meta">
        {tr("{0}杯・最高★{1}", stamp.count, stamp.best)}
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
      <h3>{tr("{0}で飲んだお酒", name)}</h3>
      {rows.map((r) => (
        <Link key={r.id} href={`/record?id=${r.id}`} className="stamp-row">
          <span className="stamp-row-name">{drinkTitle(r)}</span>
          <span className="stars">{stars(r.overall)}</span>
          <span className="muted stamp-row-sub">
            {tr("{0}・{1}", r.shop, r.date.slice(5).replace("-", "/"))}
            {r.kind ? tr("・{0}", r.kind) : ""}
            {r.style ? tr("・{0}", r.style) : ""}
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
  // 英語は単語の切れ目で折り返すので、そのまま出す
  const en = getLang() === "en";
  const place = tr(entry.place);
  const label = en ? place : place.length > 8 ? `${place.slice(0, 7)}…` : place;
  return (
    <li className="diary-day">
      <span
        ref={delay.ref}
        className={!pop ? "diary-stamp" : delay.value === null ? "diary-stamp stamp-wait" : "diary-stamp stamp-pop"}
        style={delay.value === null ? undefined : { animationDelay: `${delay.value}s` }}
        data-long={label.length > 3 || undefined}
        aria-hidden
      >
        {en || label.length < 5 ? (
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
          {tr("{0}月{1}日", m, d)}<span className="muted">{tr("・{0}か所目", nth)}</span>
        </span>
        <span className="diary-title">
          {tr("{0}で {1}", entry.place, drinkTitle(r))}
        </span>
        {note && <span className={note.quote ? "diary-note quote" : "diary-note"}>{trv(note.text)}</span>}
        <span className="muted diary-sub">
          {trJoin([r.shop, r.kind, entry.count > 1 ? tr("ここで{0}杯", entry.count) : null])}
        </span>
      </Link>
    </li>
  );
}

/** 産地を初めて飲んだ日の順に。年ごとに区切って、日本一周・世界一周の旅のように読む */
function Diary({ entries, popOf }: { entries: DiaryEntry[]; popOf: (name: string) => boolean }) {
  if (entries.length === 0) {
    return (
      <EmptyState title={tr("旅はこれから")} actions={[{ href: "/new", label: tr("記録する") }]}>
        {tr("産地の入った記録をつけると、ここに旅の記録が並ぶよ。最初の一歩はどこから？")}
      </EmptyState>
    );
  }
  const first = entries[0].first.date;
  const japan = entries.filter((e) => e.japan).length;
  const years = [...new Set(entries.map((e) => e.first.date.slice(0, 4)))];
  return (
    <>
      <section className="card diary-summary">
        <div>
          <span className="muted">{tr("旅のはじまり")}</span>
          <strong>{first.split("-").map(Number).join(".")}</strong>
          <span className="muted">{tr("{0}から", entries[0].place)}</span>
        </div>
        <div>
          <span className="muted">{tr("日本一周")}</span>
          <strong>
            {trv(japan)}
            <small> / 47</small>
          </strong>
          <span className="muted">{tr("あと{0}県", 47 - japan)}</span>
        </div>
        <div>
          <span className="muted">{tr("海外など")}</span>
          <strong>{entries.length - japan}</strong>
          <span className="muted">{tr("か所")}</span>
        </div>
      </section>
      {years.map((y) => (
        <section key={y} className="card" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 15 }}>{tr("{0}年", y)}</h2>
          <ol className="diary">
            {entries.map((e, i) =>
              e.first.date.startsWith(y) ? <DiaryDay key={e.place} entry={e} nth={i + 1} pop={popOf(e.place)} /> : null,
            )}
          </ol>
        </section>
      ))}
      <p className="lead" style={{ textAlign: "center" }}>
        {tr("つづく…")}
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
  const [mapOpen, setMapOpen] = useState(false);
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
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("産地スタンプ帳")}</h1>
      </header>

      <p className="lead">
        {tr("47都道府県と海外{0}カ国のうち", total - 47)}{" "}<strong>{tr("{0}か所", stamps.size)}</strong>{" "}{tr("制覇。")}
        {view === "スタンプ帳"
          ? tr("色の付いた産地を押すと、飲んだお酒が見られます。")
          : tr("初めて飲んだ日の順に、旅のように並べました。")}
      </p>

      <div className="mode-switch stamps-switch" role="group" aria-label={tr("見かた")}>
        {(["スタンプ帳", "旅日記"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}>
            {trv(v)}
          </button>
        ))}
      </div>

      {fresh.length > 0 && (
        <p className="stamp-news" role="status">
          {tr("新しいスタンプ：{0}", trJoin(fresh.slice(0, 5)))}
          {fresh.length > 5 ? tr(" ほか{0}か所", fresh.length - 5) : ""}
        </p>
      )}

      {/* 右下の地図ボタンに最後のカードが隠れないように */}
      <main className="content" style={{ paddingBottom: 96 }}>
        {view === "旅日記" && records && <Diary entries={diary} popOf={popOf} />}
        {view === "スタンプ帳" && REGIONS.map((r) => {
          const done = r.places.filter((c) => stamps.has(c.name)).length;
          return (
            <section key={r.region} className="card" style={{ gap: 12 }}>
              <div className="card-top">
                <h2 style={{ fontSize: 15 }}>{trv(r.region)}</h2>
                <span className="muted">
                  {trv(done)} / {trv(r.places.length)}
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
            <h2 style={{ fontSize: 15 }}>{tr("そのほかの産地")}</h2>
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

      {records && (
        <button type="button" className="map-fab" aria-label={tr("日本地図で見る")} onClick={() => setMapOpen(true)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" />
            <path d="M9 4v13.5M15 6.5V20" />
          </svg>
          <span>{tr("地図")}</span>
        </button>
      )}
      {mapOpen && <JapanMapSheet stamps={stamps} onClose={() => setMapOpen(false)} />}
    </>
  );
}
