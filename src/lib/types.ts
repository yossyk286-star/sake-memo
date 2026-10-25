export type Kind = "日本酒" | "ワイン" | "ビール" | "ウイスキー" | "焼酎" | "その他";

/** 1〜5 の評価。未入力は null */
export type Score = 1 | 2 | 3 | 4 | 5;

export interface TastingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  shop: string;
  name: string; // 銘柄・商品名
  maker: string; // 蔵元・醸造所・ワイナリー
  origin: string; // 産地（都道府県や国）
  kind: Kind | null;
  /** タイプ（純米吟醸、赤、IPA など）。選べる値は種類で変わる */
  style: string | null;
  /** 飲み方（冷酒、燗、ロック など）。選べる値は種類で変わる */
  serve: string | null;
  menuNote: string; // お店の説明
  flavors: string[]; // 感じた味
  sweetness: Score | null;
  acidity: Score | null;
  body: Score | null;
  overall: Score;
  pairing: string; // 合わせた料理
  memo: string;
  photo: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type RecordDraft = Omit<TastingRecord, "id" | "createdAt" | "updatedAt" | "overall"> & {
  overall: Score | null;
};
