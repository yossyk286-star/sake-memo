"use client";

import { tr } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";

/** 電波がなくて読み取れなかった写真があるときのお知らせ。電波が戻ったら呼び出し側が自動で読み取る */
export default function PendingPhotos({
  count,
  busy,
  onRead,
  onDiscard,
}: {
  count: number;
  busy: boolean;
  onRead: () => void;
  onDiscard: () => void;
}) {
  if (count === 0) return null;
  return (
    <section className="tips pending-photos" role="status" aria-label={tr("あとで読み取る写真")}>
      <h2>{tr("電波がなくて読み取れなかった写真：{0}枚", count)}</h2>
      <p className="term-desc" style={{ margin: 0 }}>
        {tr("写真は取っておきました。電波が戻ったら自動で読み取ります。")}
      </p>
      <div className="row">
        <button type="button" className="btn-secondary" style={{ flex: 1, background: "var(--accent-soft)" }} disabled={busy} onClick={onRead}>
          {busy ? tr("読み取り中…") : tr("今読み取る")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, background: "none", color: "var(--muted)" }}
          disabled={busy}
          onClick={async () => {
            if (await askConfirm({ message: tr("取っておいた写真を消しますか？"), action: tr("消す") })) onDiscard();
          }}
        >
          {tr("消す")}
        </button>
      </div>
    </section>
  );
}
