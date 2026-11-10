"use client";

import { getLang, tr } from "@/lib/i18n";
import type { Stash } from "@/lib/recordDraft";
import { askConfirm } from "@/components/ConfirmSheet";

/** 前に書きかけて保存しなかった記録があるとき、新しい記録の画面のいちばん上に出す */
export default function DraftNote({ stash, onResume, onDiscard }: { stash: Stash; onResume: () => void; onDiscard: () => void }) {
  const when = new Date(stash.savedAt).toLocaleString(getLang() === "en" ? "en-US" : "ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <section className="tips draft-note" style={{ margin: "16px 16px 0" }} aria-label={tr("書きかけの記録")}>
      <h2>{tr("書きかけの記録があります")}</h2>
      <p className="term-desc" style={{ margin: 0 }}>
        {tr("{0}（{1}）", stash.draft.name.trim() || tr("名前なし"), when)}
      </p>
      <div className="row">
        <button type="button" className="btn-secondary" style={{ flex: 1, background: "var(--surface)" }} onClick={onResume}>
          {tr("続きを書く")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, background: "none", color: "var(--muted)" }}
          onClick={async () => {
            if (await askConfirm({ message: tr("書きかけの記録を消しますか？"), action: tr("消す") })) onDiscard();
          }}
        >
          {tr("消す")}
        </button>
      </div>
    </section>
  );
}
