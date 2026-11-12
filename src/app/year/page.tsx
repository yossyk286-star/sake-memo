"use client";

import BackLink from "@/components/BackLink";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { drinkTitle } from "@/components/RecordCard";
import { listRecords, peekRecords } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { yearCards } from "@/lib/recap";
import { cardImage, shareImage } from "@/lib/shareImage";
import { toast } from "@/lib/toast";
import type { TastingRecord } from "@/lib/types";

/** 1年まとめ（5）。カードを横にめくって、1枚ずつ画像にして送れる */
function YearBody() {
  const y = Number(useSearchParams().get("y")) || new Date().getFullYear();
  const [records, setRecords] = useState<TastingRecord[] | null>(peekRecords);
  useEffect(() => {
    listRecords().then(setRecords);
  }, []);
  const cards = useMemo(() => (records ? yearCards(records, y, drinkTitle, tr) : null), [records, y]);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const go = (i: number) => box.current?.scrollTo({ left: i * box.current.clientWidth, behavior: "smooth" });

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{tr("{0}年のまとめ", y)}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        {records && !cards && <p className="empty">{tr("{0}年の記録が少ないので、まとめはまだ作れません。", y)}</p>}
        {cards && (
          <>
            <div
              className="year-cards"
              ref={box}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAt(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {cards.map((c, i) => (
                <section key={i} className="year-card" aria-label={c.title}>
                  <span className="recap-eyebrow">{c.eyebrow}</span>
                  <h2>{c.title}</h2>
                  <div className="recap-stats">
                    {c.stats.map((s) => (
                      <div key={s.label}>
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                  {c.lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                  <div className="row" style={{ marginTop: "auto" }}>
                    {c.recordId && (
                      <Link href={`/record?id=${c.recordId}`} className="recap-btn">
                        {tr("記録を見る")}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="recap-btn"
                      onClick={async () => {
                        const blob = await cardImage(c);
                        await shareImage(blob, `${c.eyebrow} ${i + 1}`).catch(() => toast("共有できませんでした", { tone: "warn" }));
                      }}
                    >
                      {tr("画像で送る")}
                    </button>
                  </div>
                </section>
              ))}
            </div>
            <div className="year-nav">
              <button type="button" className="btn-secondary" disabled={at === 0} onClick={() => go(at - 1)}>
                {tr("‹ 前へ")}
              </button>
              <div className="year-dots" aria-label={tr("{0}/{1}枚目", at + 1, cards.length)}>
                {cards.map((_, i) => (
                  <i key={i} className={i === at ? "on" : ""} />
                ))}
              </div>
              <button type="button" className="btn-primary" disabled={at === cards.length - 1} onClick={() => go(at + 1)}>
                {tr("次へ ›")}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function YearPage() {
  return (
    <Suspense>
      <YearBody />
    </Suspense>
  );
}
