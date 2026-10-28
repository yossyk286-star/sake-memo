"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { stars, yen } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { KINDS } from "@/lib/glossary";
import { today } from "@/lib/lastScan";
import { MOODS } from "@/lib/moods";
import { loadPrefs, type MyPrefs } from "@/lib/prefs";
import { buildShowCard, isEmptyCard, loadTodayMoods, moodPhrase, saveTodayMoods, showKinds } from "@/lib/showCard";
import type { Kind, TastingRecord } from "@/lib/types";

function Row({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="show-row">
      <span className="show-label">{label}</span>
      <span className="show-value">{items.join("、")}</span>
    </div>
  );
}

const MOOD_LABELS = MOODS.map((m) => m.label);

/** お店で店員さんに画面を見せて「こういうのをください」と伝えるための画面。記録と登録した好みか、今日の気分から作る */
export default function ShowPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [prefs, setPrefs] = useState<MyPrefs | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  // カウンター越しに店員さんへ向けるため、カードだけ上下を逆さにする
  const [flipped, setFlipped] = useState(false);
  // いつもの好みを見せるか、今日の気分を見せるか
  const [mode, setMode] = useState<"prefs" | "mood">("prefs");
  const [moods, setMoods] = useState<string[]>([]);
  const [moodText, setMoodText] = useState("");

  useEffect(() => {
    const saved = loadTodayMoods(today());
    setMoods(saved);
    if (saved.length > 0) setMode("mood");
    const p = loadPrefs();
    setPrefs(p);
    listRecords().then((rs) => {
      setRecords(rs);
      setKind(showKinds(rs, p)[0] ?? null);
    });
  }, []);

  // 見せているあいだに画面が暗くならないようにする（対応している端末だけ）
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  const kinds = useMemo(() => (records && prefs ? showKinds(records, prefs) : []), [records, prefs]);
  // 今日の気分では、記録がない種類も選べるようにする（よく飲む種類が先）
  const kindOptions = useMemo(
    () => (mode === "mood" ? [...new Set([...kinds, ...KINDS.filter((k) => k !== "その他")])] : kinds),
    [mode, kinds],
  );
  const card = useMemo(() => (records && prefs ? buildShowCard(records, prefs, kind) : null), [records, prefs, kind]);

  function updateMoods(next: string[]) {
    setMoods(next);
    saveTodayMoods(today(), next);
  }

  function addMoodText() {
    const m = moodText.trim();
    if (m && !moods.includes(m)) updateMoods([...moods, m]);
    setMoodText("");
  }

  // 何を見せるか。出すものがなければ案内だけ
  const showing = card && (mode === "mood" ? moods.length > 0 : !isEmptyCard(card));

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>店員さんに見せる</h1>
        <Link href="/prefs" className="back" style={{ gridColumn: 3, justifySelf: "end" }}>
          編集
        </Link>
      </header>

      {card && (
        <main className="content show-page">
          {/* 相手に向けているあいだは、カードが上に来るよう選ぶところを隠す */}
          {!flipped && (
            <div className="show-modes" role="group" aria-label="見せるもの">
              <button
                type="button"
                aria-pressed={mode === "prefs"}
                onClick={() => {
                  setMode("prefs");
                  // 今日の気分で記録のない種類を選んでいたら、いつもの種類に戻す
                  if (kind && !kinds.includes(kind)) setKind(kinds[0] ?? null);
                }}
              >
                いつもの好み
              </button>
              <button type="button" aria-pressed={mode === "mood"} onClick={() => setMode("mood")}>
                今日の気分
              </button>
            </div>
          )}
          {!flipped && kindOptions.length > 1 && (
            <div className="field">
              <span className="label">{mode === "mood" ? "飲みたいお酒" : "種類"}</span>
              <div className="row" role="group" aria-label={mode === "mood" ? "飲みたいお酒" : "種類"}>
                {kindOptions.map((k) => (
                  <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                    {k}
                  </button>
                ))}
                <button type="button" className="chip" aria-pressed={kind === null} onClick={() => setKind(null)}>
                  {mode === "mood" ? "おまかせ" : "ぜんぶ"}
                </button>
              </div>
            </div>
          )}

          {!flipped && mode === "mood" && (
            <div className="field">
              <span className="label">今日の気分（いくつでも）</span>
              <div className="row" role="group" aria-label="今日の気分">
                {[...MOOD_LABELS, ...moods.filter((m) => !MOOD_LABELS.includes(m))].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip"
                    aria-pressed={moods.includes(m)}
                    onClick={() => updateMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <label htmlFor="show-mood" className="visually-hidden">
                  ほかの気分
                </label>
                <input
                  id="show-mood"
                  className="input"
                  placeholder="ほかの気分（例：疲れたから甘め）"
                  maxLength={40}
                  value={moodText}
                  onChange={(e) => setMoodText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      addMoodText();
                    }
                  }}
                />
                <button type="button" className="btn-secondary" onClick={addMoodText}>
                  追加
                </button>
              </div>
            </div>
          )}

          {!showing ? (
            mode === "mood" ? (
              <p className="empty">今日の気分を選ぶと、店員さんに見せるカードが出ます。</p>
            ) : (
              <p className="empty">
                まだ見せる好みがありません。
                <br />
                <Link href="/prefs">わたしの好み</Link>を登録するか、★4以上の記録がたまるとここに出ます。
              </p>
            )
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary show-flip"
                aria-pressed={flipped}
                onClick={() => setFlipped(!flipped)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
                </svg>
                {flipped ? "向きを戻す" : "上下を逆にして相手に向ける"}
              </button>
              {mode === "mood" ? (
                <section className="show-card" data-flipped={flipped || undefined} aria-label="今日の気分">
                  <p className="show-ask">
                    <span>今日は</span>
                    <span>こういう{kind ?? "お酒"}が</span>
                    <span>飲みたいです</span>
                  </p>
                  <div className="show-taste">
                    {moods.map((m) => (
                      <span key={m} className="show-pill">
                        {moodPhrase(m)}
                      </span>
                    ))}
                  </div>
                  <div className="show-rows">
                    <Row label="苦手" items={card.dislikes} />
                    {card.budget && <Row label="予算" items={[`1杯 ${yen(card.budget)}くらいまで`]} />}
                  </div>
                  <p className="show-thanks">
                    <span>おすすめがあれば</span>
                    <span>教えてください</span>
                  </p>
                </section>
              ) : (
                <section className="show-card" data-flipped={flipped || undefined} aria-label="わたしの好み">
                  <p className="show-ask">
                    {/* 変なところで折り返さないよう、言葉のまとまりごとに区切る */}
                    <span>こういう{kind ?? "お酒"}が</span>
                    <span>好きです</span>
                  </p>
                  {card.taste.length > 0 && (
                    <div className="show-taste">
                      {card.taste.map((t) => (
                        <span key={t} className="show-pill">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="show-rows">
                    <Row label="タイプ" items={card.styles} />
                    <Row label="飲み方" items={card.serves} />
                    <Row label="好きな味" items={card.likes} />
                    <Row label="苦手" items={card.dislikes} />
                    {card.budget && <Row label="予算" items={[`1杯 ${yen(card.budget)}くらいまで`]} />}
                  </div>
                  {card.favorites.length > 0 && (
                    <div className="show-favs">
                      <span className="show-label">おいしかったお酒</span>
                      <ul>
                        {card.favorites.map((r) => (
                          <li key={r.id}>
                            <strong>{r.name}</strong>
                            <span className="muted">
                              {[r.maker, r.origin].filter(Boolean).join("・")} {stars(r.overall)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="show-thanks">
                    <span>おすすめがあれば</span>
                    <span>教えてください</span>
                  </p>
                </section>
              )}
            </>
          )}
        </main>
      )}
    </>
  );
}
