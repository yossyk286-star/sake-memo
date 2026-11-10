"use client";

import { useEffect, useState } from "react";
import { daysSince, lastBackup, needsBackupNudge, saveBackup, snoozeBackupNudge } from "@/lib/backup";
import { tr } from "@/lib/i18n";

/** しばらく書き出していないとき、記録の一覧の上に出すお知らせ */
export default function BackupNudge({ count }: { count: number }) {
  const [show, setShow] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => {
    setShow(needsBackupNudge(count));
    setLast(lastBackup());
  }, [count]);
  if (!show) return null;

  return (
    <section className="tips backup-nudge" aria-label={tr("バックアップのお知らせ")}>
      <h2>{tr("記録を書き出しておきませんか？")}</h2>
      <p className="term-desc" style={{ margin: 0 }}>
        {last === null
          ? tr("記録はこの端末の中だけにあります。{0}件たまったので、スマホをなくしたときのために書き出しておくと安心です。", count)
          : tr("前に書き出してから{0}日たちました。いまの{1}件を書き出しておくと安心です。", daysSince(last), count)}
      </p>
      <div className="row">
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, background: "var(--surface)" }}
          onClick={async () => {
            if (await saveBackup()) setShow(false);
          }}
        >
          {tr("書き出す")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, background: "none", color: "var(--muted)" }}
          onClick={() => {
            snoozeBackupNudge();
            setShow(false);
          }}
        >
          {tr("あとで")}
        </button>
      </div>
    </section>
  );
}
