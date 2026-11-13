"use client";

import BackLink from "@/components/BackLink";
import Link from "next/link";
import { startTour, t, TOURS, type TourId } from "@/lib/guide";
import { GUIDE } from "./sections";
import { tr } from "@/lib/i18n";

/** 使い方。設定から開く。項目を押すと手順が開く */
export default function GuidePage() {
  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/settings" />
        <h1>{tr("使い方")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16, gap: 10 }}>
        {GUIDE.map((g, i) => (
          <details key={g.id} className="card guide-item" open={i === 0}>
            <summary>
              <strong>{t(g.title)}</strong>
              <span className="muted">{t(g.where)}</span>
            </summary>
            <ol>
              {g.steps.map((s, j) => (
                <li key={j}>{t(s)}</li>
              ))}
            </ol>
            {g.href && (
              <Link href={g.href} className="guide-open">
                {tr("この画面を開く")}
              </Link>
            )}
          </details>
        ))}
        <h2 className="section-title">{tr("画面の案内をもう一度見る")}</h2>
        <div className="guide-tours">
          {(Object.keys(TOURS) as TourId[]).map((id) => (
            <button key={id} type="button" className="btn-secondary" onClick={() => startTour(id)}>
              {t(TOURS[id].label)}
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
