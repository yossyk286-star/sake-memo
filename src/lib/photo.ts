import { useEffect, useMemo } from "react";
import type { TastingRecord } from "./types";

/** 写真を長辺 1280px の JPEG に縮小する（端末の保存容量を節約するため） */
export async function shrinkPhoto(file: Blob, maxSide = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("写真を変換できませんでした"))), "image/jpeg", quality),
  );
}

/**
 * AI に読み取らせる写真（メニュー・ラベル）用の縮小。小さい字がつぶれないよう、記録用より大きく・きれいに残す。
 * AI はこれより大きい画像を自分で縮めてしまうので、1600px より大きくしても読みやすさは変わらない
 */
export function shrinkForReading(file: Blob) {
  return shrinkPhoto(file, 1600, 0.9);
}

/** 記録の写真。1枚だけだった頃の記録（photo）も同じように扱う */
export function photosOf(r: Pick<TastingRecord, "photo"> & { photos?: Blob[] }): Blob[] {
  return r.photos ?? (r.photo ? [r.photo] : []);
}

/** 写真を表示するための URL。画面を離れたら片付ける */
export function usePhotoURLs(photos: Blob[]) {
  const urls = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/** 選んだファイルをまとめて縮小する */
export function shrinkPhotos(files: FileList | null) {
  return Promise.all([...(files ?? [])].map((f) => shrinkPhoto(f)));
}
