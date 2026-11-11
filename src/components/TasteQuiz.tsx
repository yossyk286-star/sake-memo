"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TASTE_QUIZ } from "@/lib/appeal";
import { loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";
import { tr, trv } from "@/lib/i18n";
import BuddyFace from "./BuddyFace";

/** 8問の好み診断（44）。答えを「わたしの好み」に入れて、メニューのおすすめや次の一杯に使う */
export default function TasteQuiz({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const [prefs, setPrefs] = useState<MyPrefs>(() => loadPrefs());
  const q = TASTE_QUIZ[at];
  const done = at >= TASTE_QUIZ.length;

  function next() {
    setAt((a) => Math.min(a + 1, TASTE_QUIZ.length));
  }
  // 最後まで答えたら保存する（選んですぐ次へ進んだ答えも入るよう、進んだあとで保存する）
  useEffect(() => {
    if (done) savePrefs(prefs);
  }, [done, prefs]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet quiz-sheet" role="dialog" aria-modal="true" aria-labelledby="quiz-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="quiz-title">{tr("好み診断")}</h2>
          <button className="icon-btn" aria-label={tr("閉じる")} onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="quiz-progress" aria-hidden="true">
          <i style={{ width: `${(Math.min(at, TASTE_QUIZ.length) / TASTE_QUIZ.length) * 100}%` }} />
        </div>
        {done ? (
          <div className="quiz-done">
            <BuddyFace mood="wow" size={64} />
            <strong>{tr("あなたの好み、覚えたよ！")}</strong>
            <p className="muted">{tr("メニューを撮ったときのおすすめと「次の一杯に」に使います。「わたしの好み」でいつでも直せます。")}</p>
            <button type="button" className="btn-primary" onClick={onDone}>
              {tr("おすすめを見る")}
            </button>
          </div>
        ) : (
          <div key={at} className="quiz-q">
            <p className="muted quiz-count">{tr("{0} / {1}", at + 1, TASTE_QUIZ.length)}</p>
            <strong>{trv(q.q)}</strong>
            <div className="chip-wrap">
              {q.multi
                ? q.options.map((o) => {
                    const list = prefs[q.key] as string[];
                    const on = list.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => setPrefs({ ...prefs, [q.key]: on ? list.filter((x) => x !== o.value) : [...list, o.value] })}
                      >
                        {trv(o.label)}
                      </button>
                    );
                  })
                : q.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className="chip"
                      aria-pressed={prefs[q.key] === o.value}
                      onClick={() => {
                        setPrefs({ ...prefs, [q.key]: o.value });
                        // 1つ選ぶ問いは、選んだらすぐ次へ
                        window.setTimeout(next, 180);
                      }}
                    >
                      {trv(o.label)}
                    </button>
                  ))}
            </div>
            <div className="quiz-nav">
              {at > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setAt(at - 1)}>
                  {tr("戻る")}
                </button>
              )}
              <button type="button" className="btn-primary" onClick={next}>
                {at + 1 >= TASTE_QUIZ.length ? tr("できた") : tr("次へ")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
