"use client";

import { usePhotoURLs, markIfLoaded, markLoaded } from "@/lib/photo";
import { tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";
import { useState } from "react";
import Lightbox from "./Lightbox";

/** 写真を横に並べる。onRemove があれば1枚ずつ外せる */
export function PhotoRow({ photos, onRemove }: { photos: Blob[]; onRemove?: (i: number) => void }) {
  const urls = usePhotoURLs(photos);
  // 押した写真を全画面で見る（12）
  const [big, setBig] = useState<number | null>(null);
  if (urls.length === 0) return null;
  return (
    <div className="photo-row">
      {big !== null && <Lightbox urls={urls} start={big} onClose={() => setBig(null)} />}
      {urls.map((u, i) => (
        <div key={u} className="photo-item">
          <button type="button" className="photo-open" aria-label={tr("写真 {0} を大きく見る", i + 1)} onClick={() => setBig(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={tr("記録の写真 {0}", i + 1)} className="photo-fade" decoding="async" ref={markIfLoaded} onLoad={markLoaded} />
          </button>
          {onRemove && (
            <button type="button" className="photo-remove" aria-label={tr("写真 {0} を外す", i + 1)} onClick={async () => {
                // eslint-disable-next-line @next/next/no-img-element
                const preview = <img src={u} alt="" className="confirm-photo" />;
                if (await askConfirm({ preview, message: tr("この写真を外しますか？"), action: tr("外す") })) onRemove(i);
              }}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** 写真を選ぶボタン。複数まとめて選べる（カメラで撮るのも可）。chip なら小さな丸いボタンにする */
export function PhotoAddButton({
  label,
  onFiles,
  chip = false,
}: {
  label: string;
  onFiles: (files: FileList | null) => void;
  chip?: boolean;
}) {
  return (
    <label className={chip ? "photo-add-chip" : "btn-ghost"} style={chip ? undefined : { flex: 1 }}>
      {trv(label)}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          onFiles(e.target.files);
          // 同じ写真をもう一度選んでも反応するように
          e.target.value = "";
        }}
        className="visually-hidden"
      />
    </label>
  );
}
