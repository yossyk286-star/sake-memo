"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { stars, yen } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import { loadPrefs, type MyPrefs } from "@/lib/prefs";
import { buildShowCard, isEmptyCard, showKinds } from "@/lib/showCard";
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

/** お店で店員さんに画面を見せて「こういうのをください」と伝えるための画面。記録と登録した好みから作る */
export default function ShowPage() {
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  const [prefs, setPrefs] = useState<MyPrefs | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  // カウンター越しに店員さんへ向けるため、カードだけ上下を逆さにする
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
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
  const card = useMemo(
    () => (records && prefs ? buildShowCard(records, prefs, kind) : null),
    [records, prefs, kind],
  );

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
          {kinds.length > 1 && (
            <div className="row" role="group" aria-label="種類">
              {kinds.map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {k}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={kind === null} onClick={() => setKind(null)}>
                ぜんぶ
              </button>
            </div>
          )}

          {isEmptyCard(card) ? (
            <p className="empty">
              まだ見せる好みがありません。
              <br />
              <Link href="/prefs">わたしの好み</Link>を登録するか、★4以上の記録がたまるとここに出ます。
            </p>
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
            </>
          )}
        </main>
      )}
    </>
  );
}
