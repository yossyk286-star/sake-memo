"use client";

import { usePhotoURLs } from "@/lib/photo";
import { tr, trv } from "@/lib/i18n";

/** 写真を横に並べる。onRemove があれば1枚ずつ外せる */
export function PhotoRow({ photos, onRemove }: { photos: Blob[]; onRemove?: (i: number) => void }) {
  const urls = usePhotoURLs(photos);
  if (urls.length === 0) return null;
  return (
    <div className="photo-row">
      {urls.map((u, i) => (
        <div key={u} className="photo-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={tr("記録の写真 {0}", i + 1)} />
          {onRemove && (
            <button type="button" className="photo-remove" aria-label={tr("写真 {0} を外す", i + 1)} onClick={() => confirm(tr("この写真を外しますか？")) && onRemove(i)}>
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
