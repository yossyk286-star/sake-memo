"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { drinkTitle, stars, yen } from "@/components/RecordCard";
import TasteMap from "@/components/TasteMap";
import { summarize, type GroupAverage } from "@/lib/analysis";
import { collectStamps } from "@/lib/origins";
import { listBottles, listRecords, listWishes, peekBottles, peekRecords, peekWishes } from "@/lib/db";
import { nextIdeas } from "@/lib/nextDrink";
import { loadPrefs } from "@/lib/prefs";
import { groupByShop } from "@/lib/shops";
import type { TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import TitleCard from "@/components/TitleCard";
import { ordered, ReorderList, type Section } from "@/components/Reorder";
import TasteQuiz from "@/components/TasteQuiz";
import { useFeatures } from "@/lib/features";
import { APP } from "@/lib/appeal";
import { tr, trv } from "@/lib/i18n";

const MIN_RECORDS = 5;

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 値段を入れた記録の平均と、安くて評価の高かったお酒 */
function PriceLines({ records, budget }: { records: TastingRecord[]; budget: number | null }) {
  const priced = records.filter((r) => r.price);
  if (priced.length === 0) return null;
  const liked = priced.filter((r) => r.overall >= 4);
  // 評価が高い順、同じなら安い順
  const bargain = [...liked].sort((a, b) => b.overall - a.overall || a.price! - b.price!)[0];
  return (
    <>
      <h2 style={{ fontSize: 15 }}>{tr("値段")}</h2>
      <p style={{ margin: 0, fontSize: 15 }}>
        {tr("1杯の平均")}{" "}<strong>{yen(average(priced.map((r) => r.price!)))}</strong>
        <span className="muted">{tr("（{0}杯）", priced.length)}</span>
      </p>
      {liked.length > 0 && (
        <p style={{ margin: 0, fontSize: 15 }}>
          {tr("★4以上だったお酒の平均")}{" "}<strong>{yen(average(liked.map((r) => r.price!)))}</strong>
        </p>
      )}
      {budget && (
        <p style={{ margin: 0, fontSize: 15 }}>
          {tr("予算 {0} 以内：{1} / {2}杯", yen(budget), priced.filter((r) => r.price! <= budget).length, priced.length)}
        </p>
      )}
      {bargain && (
        <p style={{ margin: 0, fontSize: 15 }}>
          {tr("お値打ちだったお酒：")}
          <Link href={`/record?id=${bargain.id}`}>
            {tr("{0}（{1}・{2}）", drinkTitle(bargain), stars(bargain.overall), yen(bargain.price!))}
          </Link>
        </p>
      )}
    </>
  );
}

type View = "taste" | "title";
const VIEW_KEY = `${APP.id}:taste-view`;
const ORDER_KEY = `${APP.id}:taste-order`;

function loadOrder(): Record<View, string[]> {
  try {
    const s = localStorage.getItem(ORDER_KEY);
    if (s) return { taste: [], title: [], ...(JSON.parse(s) as Partial<Record<View, string[]>>) };
  } catch {
    // 読めないときは元の順
  }
  return { taste: [], title: [] };
}

/** 種類・タイプ・飲み方・産地の評価を、切り替え1枚で見せる */
function BarsSwitch({ groups }: { groups: [string, GroupAverage[]][] }) {
  const shown = groups.filter(([, rows]) => rows.length > 0);
  const [pick, setPick] = useState(0);
  if (shown.length === 0) return null;
  const [, rows] = shown[Math.min(pick, shown.length - 1)];
  return (
    <section className="card" style={{ gap: 12 }} aria-label={tr("ごとの評価")}>
      <div className="mode-switch" style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }} role="group" aria-label={tr("分け方")}>
        {shown.map(([label], i) => (
          <button key={label} type="button" aria-pressed={i === Math.min(pick, shown.length - 1)} onClick={() => setPick(i)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <span>{trv(r.label)}</span>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${(r.average / 5) * 100}%` }} />
          </div>
          <span className="bar-value">
            {r.average.toFixed(1)}
            <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
              {" "}
              ({trv(r.count)})
            </span>
          </span>
        </div>
      ))}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {tr("数字は総合の平均（カッコ内は件数）。産地は2杯以上のところだけ。")}
      </p>
    </section>
  );
}

export default function TastePage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(peekRecords);
  const [wishCount, setWishCount] = useState(() => peekWishes()?.length ?? 0);
  const [bottleCount, setBottleCount] = useState(() => peekBottles()?.filter((b) => !b.finished).length ?? 0);
  const [view, setView] = useState<View>("taste");
  const [order, setOrder] = useState<Record<View, string[]>>({ taste: [], title: [] });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    listRecords().then(setRecords);
    listWishes().then((ws) => setWishCount(ws.length));
    listBottles().then((bs) => setBottleCount(bs.filter((b) => !b.finished).length));
    setOrder(loadOrder());
    try {
      if (localStorage.getItem(VIEW_KEY) === "title") setView("title");
    } catch {
      // 覚えられなくても傾向から出すだけ
    }
  }, []);

  // 切り替えた向き（中身を押した側から入れ替える）。開いたときは動かさない
  const [swap, setSwap] = useState("");
  const pickView = (v: View) => {
    if (v !== view) setSwap(v === "title" ? "swap-next" : "swap-prev");
    setView(v);
    setEditing(false);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // 覚えられなくてもよい
    }
  };
  const saveOrder = (ids: string[]) => {
    const next = { ...order, [view]: ids };
    setOrder(next);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    } catch {
      // 覚えられない端末では、開き直すと元の順
    }
  };

  const stampInfo = useMemo(() => collectStamps(records ?? []), [records]);
  const shopCount = useMemo(() => groupByShop(records ?? []).length, [records]);

  // 長い説明が続くと味マップが遠くなるので、最初は1件だけ出す
  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [prefsVer, setPrefsVer] = useState(0);
  // prefsVer：好み診断に答えたら読み直す
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ideas = useMemo(() => (records ? nextIdeas(records, loadPrefs()) : []), [records, prefsVer]);

  const count = records?.length ?? 0;
  const summary = useMemo(() => (records && count >= MIN_RECORDS ? summarize(records) : null), [records, count]);

  const tasteSections = ([
    summary && {
      id: "trend",
      label: "いまの傾向",
      node: (
        <section className="highlight">
          <span style={{ fontSize: 13 }}>{tr("いまの傾向")}</span>
          {summary.bestCombo ? (
            <p className="highlight-main">{tr("{0} の評価が高めです", summary.bestCombo.label)}</p>
          ) : (
            <p className="highlight-main">{tr("同じタイプと飲み方の組み合わせが2件以上たまると、ここに出ます")}</p>
          )}
        </section>
      ),
    },
    ideas.length > 0 && {
      id: "next",
      label: "次の一杯に",
      node: (
        <section className="tips">
          <h2>{tr("次の一杯に")}</h2>
          <ul className="next-list">
            {(showAllIdeas ? ideas : ideas.slice(0, 1)).map((i) => (
              <li key={i.title}>
                <strong>{trv(i.title)}</strong>
                <span>{trv(i.reason)}</span>
                {i.description && <span className="muted">{trv(i.description)}</span>}
              </li>
            ))}
          </ul>
          {ideas.length > 1 && (
            <button type="button" className="text-btn next-more" aria-expanded={showAllIdeas} onClick={() => setShowAllIdeas((v) => !v)}>
              {showAllIdeas ? tr("閉じる") : tr("ほかの案も見る（{0}件）", ideas.length - 1)}
            </button>
          )}
        </section>
      ),
    },
    records && records.length > 0 && { id: "map", label: "味マップ", node: <TasteMap records={records} /> },
    summary && {
      id: "bars",
      label: "種類・タイプ・飲み方・産地ごと",
      node: (
        <BarsSwitch
          groups={[
            ["種類", summary.byKind],
            ["タイプ", summary.byStyle],
            ["飲み方", summary.byServe],
            ["産地", summary.byOrigin],
          ]}
        />
      ),
    },
    records &&
      (records.some((r) => r.price) || (summary && summary.topFlavors.length > 0)) && {
        id: "price",
        label: "値段・よく感じる味",
        node: (
          <section className="card" style={{ gap: 6 }}>
            <PriceLines records={records} budget={loadPrefs().budget} />
            {summary && summary.topFlavors.length > 0 && (
              <>
                <h2 style={{ fontSize: 15, marginTop: records.some((r) => r.price) ? 8 : 0 }}>{tr("よく感じる味")}</h2>
                <div className="tags">
                  {summary.topFlavors.map((f) => (
                    <span key={f.label} className="tag" style={{ fontSize: 13 }}>
                      {trv(f.label)} ×{trv(f.count)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        ),
      },
    {
      id: "actions",
      label: "店員さんに見せる・好みくらべ",
      node: (
        <div className="taste-actions" data-tour="taste-show">
          <Link href="/show" className="hub-item hub-show">
            <strong>{tr("店員さんに見せる")}</strong>
            <span className="muted">{tr("好みを大きく表示")}</span>
          </Link>
          <Link href="/match" className="hub-item hub-show hub-match">
            <strong>{tr("友だちと好みくらべ")}</strong>
            <span className="muted">{tr("リンクで相性を見る")}</span>
          </Link>
        </div>
      ),
    },
  ] as (Section | false | null | undefined)[]).filter((s): s is Section => !!s);

  const titleSections = ([
    records && records.length > 0 && { id: "title", label: "称号としるし", node: <TitleCard records={records} /> },
    {
      id: "list",
      label: "スタンプ帳・お店・気になる・家のお酒",
      node: (
        <nav className="hub-list" aria-label={tr("記録のまとめ")}>
          <HubRow
            href="/stamps"
            icon="stamp"
            label="産地スタンプ帳"
            value={tr("{0} / {1}か所", stampInfo.stamps.size, stampInfo.total)}
            progress={stampInfo.total ? stampInfo.stamps.size / stampInfo.total : undefined}
          />
          <HubRow href="/shops" icon="shop" label="お店" value={tr("{0}軒", shopCount)} />
          <HubRow href="/wishlist" icon="star" label="気になるお酒" value={tr("{0}件", wishCount)} />
          <HubRow href="/bottles" icon="bottle" label="家のお酒" value={tr("{0}本", bottleCount)} />
          <HubRow href="/prefs" icon="pen" label="わたしの好み" note={tr("自分で登録")} />
        </nav>
      ),
    },
  ] as (Section | false | null | undefined)[]).filter((s): s is Section => !!s);

  const features = useFeatures();
  const [quiz, setQuiz] = useState(false);
  const sections = ordered(view === "taste" ? tasteSections : titleSections, order[view]);

  return (
    <>
      <header className="page-header">
        <h1>{tr("好み")}</h1>
        {records && sections.length > 1 && (
          <button type="button" className="header-pill" onClick={() => setEditing((v) => !v)} aria-pressed={editing} data-tour="taste-sort">
            {editing ? tr("完了") : tr("並べ替え")}
          </button>
        )}
      </header>
      <main className="content">
        <div className="mode-switch" role="group" aria-label={tr("見るもの")} data-tour="taste-view">
          <button type="button" aria-pressed={view === "taste"} onClick={() => pickView("taste")}>
            {tr("わたしの傾向")}
          </button>
          <button type="button" aria-pressed={view === "title"} onClick={() => pickView("title")}>
            {tr("マイコレクション")}
          </button>
        </div>
        {view === "taste" && records && !summary && (
          <EmptyState
            title={count === 0 ? tr("好みはこれから見えてくるよ") : tr("あと{0}杯で好みがわかるよ", MIN_RECORDS - count)}
            actions={[
              { href: "/new", label: count === 0 ? tr("1杯目を記録する") : tr("記録する") },
              // 記録が少ないうちは8問で好みを決められる（44）
              ...(features.tasteQuiz ? [{ onClick: () => setQuiz(true), label: tr("8問で好みを決める") }] : []),
            ]}
          >
            {tr("記録が{0}件たまると、あなたの好みの傾向を出すよ（いま {1}件）。", MIN_RECORDS, count)}
          </EmptyState>
        )}
        {editing ? (
          <>
            <p className="muted reorder-lead">{tr("つまんで上下に動かすと、この順で並びます。")}</p>
            <ReorderList key={view} sections={sections} onOrder={saveOrder} />
            {order[view].length > 0 && (
              <button type="button" className="text-btn" onClick={() => saveOrder([])}>
                {tr("元の順にもどす")}
              </button>
            )}
          </>
        ) : (
          records && (
            <div key={view} className={`swap-wrap ${swap}`}>
              {sections.map((s) => (
                <Fragment key={s.id}>{s.node}</Fragment>
              ))}
            </div>
          )
        )}
      </main>
      {quiz && (
        <TasteQuiz
          onClose={() => setQuiz(false)}
          onDone={() => {
            setQuiz(false);
            // 答えた好みで「次の一杯に」を出し直す
            setPrefsVer((v) => v + 1);
          }}
        />
      )}
    </>
  );
}

const ICONS: Record<string, ReactNode> = {
  stamp: <><circle cx="10" cy="10" r="6.5" /><circle cx="10" cy="10" r="3" /></>,
  shop: <path d="M3.5 8.5 10 3.5l6.5 5V16h-13z M8 16v-4h4v4" />,
  star: <path d="m10 3 2.1 4.4 4.8.6-3.5 3.3.9 4.7L10 13.7 5.7 16l.9-4.7L3.1 8l4.8-.6z" />,
  bottle: <path d="M8 3h4v3.5l1.5 2V17h-7V8.5L8 6.5z M6.5 11h7" />,
  pen: <path d="M4 16l1-4 8-8 3 3-8 8zM11.5 5.5l3 3" />,
};

/** 称号の画面の一覧の1行（アイコン・名前・数字・›） */
function HubRow({
  href,
  icon,
  label,
  value,
  note,
  progress,
}: {
  href: string;
  icon: string;
  label: string;
  value?: string;
  note?: string;
  /** 0〜1。いちばん上の大きなタイルに細い帯で出す */
  progress?: number;
}) {
  return (
    <Link href={href} className="hub-row">
      <span className="hub-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          {ICONS[icon]}
        </svg>
      </span>
      <strong>{tr(label)}</strong>
      {value && <HubValue text={value} />}
      {note && <span className="muted">{note}</span>}
      {progress !== undefined && (
        <span className="hub-gauge" aria-hidden="true">
          <span style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }} />
        </span>
      )}
    </Link>
  );
}

/** 「5 / 66か所」「2軒」の頭の数字を大きく、残りを小さく出す */
function HubValue({ text }: { text: string }) {
  const m = /^(\d+)\s*(.*)$/.exec(text);
  return (
    <span className="hub-value">
      {m ? m[1] : text}
      {m?.[2] && <small>{m[2]}</small>}
    </span>
  );
}
