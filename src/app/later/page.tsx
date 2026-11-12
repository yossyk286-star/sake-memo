"use client";

import LineIcon from "@/components/LineIcon";
import BackLink from "@/components/BackLink";
import Link from "next/link";
import { useEffect, useState } from "react";
import { askConfirm } from "@/components/ConfirmSheet";
import { shortDate } from "@/components/RecordCard";
import { addLater, LATER_EVENT, loadLater, removeLater, type LaterItem } from "@/lib/later";
import { tr } from "@/lib/i18n";
import { shrinkPhotos, usePhotoURLs } from "@/lib/photo";
import { toast } from "@/lib/toast";

function Row({ item, onRemove }: { item: LaterItem; onRemove: () => void }) {
  const urls = usePhotoURLs(item.photos, item.id);
  return (
    <div className="card later-row">
      <div className="later-photos">
        {urls.slice(0, 3).map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt="" />
        ))}
      </div>
      <div className="later-body">
        <strong>{[shortDate(item.date), item.shop].filter(Boolean).join(tr("・"))}</strong>
        <span className="muted">{tr("写真 {0}枚", item.photos.length)}</span>
        <div className="row">
          <Link href={`/new?later=${item.id}`} className="btn-primary later-go-btn">
            {tr("記録する")}
          </Link>
          <button type="button" className="btn-ghost" onClick={onRemove}>
            {tr("消す")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 「あとで書く」箱（41）。お店では写真だけ撮っておき、帰ってから記録する */
export default function LaterPage() {
  const [items, setItems] = useState<LaterItem[] | null>(null);
  useEffect(() => {
    const load = () => loadLater().then(setItems);
    load();
    window.addEventListener(LATER_EVENT, load);
    return () => window.removeEventListener(LATER_EVENT, load);
  }, []);

  async function add(files: FileList | null) {
    try {
      const photos = await shrinkPhotos(files);
      if (photos.length) await addLater(photos);
    } catch {
      toast("写真を読み込めませんでした", { tone: "warn" });
    }
  }

  async function remove(item: LaterItem) {
    const ok = await askConfirm({ message: tr("この写真を「あとで書く」から消しますか？"), action: tr("消す") });
    if (ok) await removeLater(item.id);
  }

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{tr("あとで書く")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        <p className="lead" style={{ margin: 0, padding: 0 }}>
          {tr("お店では写真だけ撮っておいて、帰ってからまとめて記録できます。撮った日とお店の名前はそのまま入ります。")}
        </p>
        <label className="btn-secondary" style={{ cursor: "pointer" }}>
          <LineIcon name="camera" />
          {tr("撮って入れる")}
          <input type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={(e) => add(e.target.files)} />
        </label>
        {items?.length === 0 && <p className="empty">{tr("いまは何も入っていません。")}</p>}
        <div className="list-group later-list">
          {items?.map((it) => (
            <Row key={it.id} item={it} onRemove={() => remove(it)} />
          ))}
        </div>
      </main>
    </>
  );
}
