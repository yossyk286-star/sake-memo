import { useEffect, useMemo, useState } from "react";
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

/** 写真はぼかした状態から、読み込めたらくっきりにする（CSS の img.photo-fade[data-loaded]） */
export function markLoaded(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget;
  // 絵を作り終えてからくっきりにする（作りながらぼかしを解くと、大きな写真で画面が一瞬止まる）
  const ready = typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve();
  ready.then(() => {
    img.dataset.loaded = "";
  });
}
/** すでに読み込み済み（キャッシュ）の写真は、onLoad を待たずにくっきりにする */
export function markIfLoaded(img: HTMLImageElement | null) {
  if (img?.complete && img.naturalWidth > 0) img.dataset.loaded = "";
}

/**
 * 一覧の小さな写真（46px）用の縮小版。元の写真（長辺 1280px）をそのまま並べると、
 * 画面を開くたびに大きな写真を何枚も読み直して重くなるので、小さく作り直して覚えておく。
 * 覚えた URL は画面を移っても使い回す（タブを戻ったときに読み直さず、ぼかしの動きもくり返さない）
 */
const THUMB_PX = 160;
const THUMB_MAX = 400;
const thumbs = new Map<string, string>();
const making = new Map<string, Promise<string>>();
let line: Promise<unknown> = Promise.resolve();

async function makeThumb(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  // 正方形に切り抜いて出すので、短い辺を THUMB_PX にそろえる
  const scale = Math.min(1, THUMB_PX / Math.min(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("thumb"))), "image/jpeg", 0.85));
}

function remember(key: string, url: string) {
  thumbs.set(key, url);
  if (thumbs.size > THUMB_MAX) {
    const [oldKey, oldUrl] = thumbs.entries().next().value!;
    thumbs.delete(oldKey);
    URL.revokeObjectURL(oldUrl);
  }
  return url;
}

/** 縮小版の URL。1枚ずつ順に作り、間に一息入れて画面の動きを止めない */
function thumbURL(key: string, blob: Blob): Promise<string> {
  const p =
    making.get(key) ??
    (line = line.then(async () => {
      await new Promise((r) => setTimeout(r, 0));
      try {
        return remember(key, URL.createObjectURL(await makeThumb(blob)));
      } catch {
        // 縮小できない端末・写真は元の写真をそのまま使う
        return remember(key, URL.createObjectURL(blob));
      } finally {
        making.delete(key);
      }
    })) as Promise<string>;
  making.set(key, p);
  return p;
}

/** 一覧の小さな写真の URL。key は記録ごと・写真が変わるごとに変わる文字（id と更新時刻など） */
export function useThumbURL(key: string, blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState(() => (blob ? thumbs.get(key) : undefined));
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const hit = thumbs.get(key);
    if (hit) return setUrl(hit);
    let alive = true;
    thumbURL(key, blob).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [key, blob]);
  return url;
}
