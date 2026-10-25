import type { ServeNote, TastingRecord } from "./types";

export const GLASSES = ["おちょこ", "ぐい呑み", "ワイングラス", "ロックグラス", "タンブラー", "ビアグラス"];

/** 温度の呼び名。打ち込む欄の候補に出す */
export const TEMP_NAMES = [
  "雪冷え（5℃）",
  "花冷え（10℃）",
  "涼冷え（15℃）",
  "常温（20℃）",
  "人肌燗（35℃）",
  "ぬる燗（40℃）",
  "上燗（45℃）",
  "熱燗（50℃）",
  "飛び切り燗（55℃）",
];

export function emptyServeNote(): ServeNote {
  return { ratio: "", temp: "", glass: null, tip: "" };
}

export function hasServeNote(n: ServeNote | undefined): n is ServeNote {
  return !!n && (!!n.ratio.trim() || !!n.temp.trim() || !!n.glass || !!n.tip.trim());
}

/** 「ソーダ 1:3・上燗（45℃）・ロックグラス・氷は大きめ」 */
export function serveNoteText(n: ServeNote) {
  return [n.ratio.trim(), n.temp.trim(), n.glass, n.tip.trim()].filter(Boolean).join("・");
}

/** 飲み方メモ付きの記録のうち、いちばん評価が高いもの（同じなら新しいほう） */
export function bestServeNote(records: TastingRecord[]) {
  return records
    .filter((r) => hasServeNote(r.serveNote))
    .sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
}
