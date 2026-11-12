import type { Kind, TastingRecord } from "./types";
import { tr } from "./i18n";

/** 1杯のだいたいの量（ml）。種類ごとのよくある1杯 */
const CUP_ML: Record<Kind, number> = {
  ビール: 350,
  日本酒: 180,
  ワイン: 120,
  ウイスキー: 30,
  焼酎: 90,
  その他: 350,
};

/** 度数を入れていない記録に使う、種類ごとのよくある度数（%） */
const USUAL_ABV: Record<Kind, number> = {
  ビール: 5,
  日本酒: 15,
  ワイン: 12,
  ウイスキー: 40,
  焼酎: 25,
  その他: 5,
};

/** 1杯の純アルコール量（g）の目安。量 × 度数 × 0.8（アルコールの重さ） */
export function alcoholGrams(r: Pick<TastingRecord, "kind" | "abv" | "ml">) {
  const kind = r.kind ?? "その他";
  const abv = r.abv ?? USUAL_ABV[kind];
  // カクテル・リキュールなど度数が高めの「その他」は小さめのグラス
  // 飲んだ量を選んでいればその量（32）
  const ml = r.ml ?? (kind === "その他" && abv >= 10 ? 120 : CUP_ML[kind]);
  return (ml * abv * 0.8) / 100;
}

/** その日の「3杯・2,400円・純アルコール約42g」。値段は入れた記録があるときだけ */
export function dayTotal(records: TastingRecord[]) {
  const priced = records.filter((r) => r.price != null);
  const yen = priced.reduce((s, r) => s + (r.price ?? 0), 0);
  const grams = Math.round(records.reduce((s, r) => s + alcoholGrams(r), 0));
  const parts = [tr("{0}杯", records.length)];
  if (priced.length > 0) parts.push(tr("{0}円", yen.toLocaleString("ja-JP")));
  parts.push(tr("純アルコール約{0}g", grams));
  return parts.join(tr("・"));
}

/** カウンター画面で使う、1杯ぶんの量の出し方と1日の目安（厚労省の「節度ある適度な飲酒」約20g） */
export const DAY_AMOUNT = {
  of: (r: Partial<TastingRecord>) => alcoholGrams({ kind: r.kind ?? null, abv: r.abv ?? null, ml: r.ml }),
  round: (n: number) => Math.round(n),
  text: (n: number) => tr("純アルコール約{0}g", n),
  guide: 20,
  guideText: "1日の目安は純アルコール約20g",
  like: (r: TastingRecord): Partial<TastingRecord> => ({ kind: r.kind, abv: r.abv, ml: r.ml }),
};
