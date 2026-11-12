import { drinkTitle } from "@/components/RecordCard";
import { TASTE_AXES } from "./axes";
import { trJoin } from "./i18n";
import { photosOf } from "./photo";
import { recordImage } from "./shareImage";
import type { TastingRecord } from "./types";

/** 記録1つを送る画像にする（詳細の「画像にして送る」と同じ絵） */
export function recordBlob(r: TastingRecord) {
  return recordImage({
    title: drinkTitle(r),
    overall: r.overall,
    tags: [r.kind, r.style, r.serve, r.origin].filter((t): t is string => !!t),
    axes: TASTE_AXES.map(([label]) => label),
    values: TASTE_AXES.map(([, get]) => get(r)),
    flavors: r.flavors,
    memo: r.memo,
    footer: trJoin([r.shop, r.date.replaceAll("-", "/")]),
    photo: photosOf(r)[0] ?? null,
  });
}

/** 何枚かまとめて共有シートで送る（57）。まとめて送れない端末では1枚ずつ保存する */
export async function shareRecords(records: TastingRecord[]) {
  const files = await Promise.all(
    records.map(async (r, i) => new File([await recordBlob(r)], `${i + 1}-${drinkTitle(r).slice(0, 20)}.png`, { type: "image/png" })),
  );
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      throw e;
    }
    return;
  }
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
