"use client";

import BackChevron from "@/components/BackChevron";
import Link from "next/link";
import { GUIDE, startTour, t } from "@/lib/guide";
import { tr } from "@/lib/i18n";

/** 使い方。設定から開く。項目を押すと手順が開く */
export default function GuidePage() {
  return (
    <>
      <header className="sub-header">
        <Link href="/settings" className="back">
          <BackChevron />
        </Link>
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
        <div className="row">
          <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => startTour("home")}>
            {tr("記録の画面で案内")}
          </button>
          <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => startTour("scan")}>
            {tr("調べる画面で案内")}
          </button>
        </div>
      </main>
    </>
  );
}
