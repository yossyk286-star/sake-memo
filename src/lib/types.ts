export type Kind = "日本酒" | "ワイン" | "ビール" | "ウイスキー" | "焼酎" | "その他";

/** 家で飲んだときの飲み方メモ。どれも入れなくてよい */
export interface ServeNote {
  /** 割り方（例：ソーダ 1:3） */
  ratio: string;
  /** 温度（例：45℃（上燗）） */
  temp: string;
  /** 酒器・グラス */
  glass: string | null;
  /** うまくいったコツ */
  tip: string;
}

/** 記録の画面で AI に聞いたことと答え */
export interface QA {
  q: string;
  a: string;
  at: number;
}

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
  /** 香りの華やかさ・キレ（後味の切れ）。後から増やした項目なので古い記録にはない */
  aroma?: Score | null;
  finish?: Score | null;
  overall: Score;
  pairing: string; // 合わせた料理
  /** 1杯の値段（円）。入れていない記録や、値段の欄ができる前の記録は null か undefined */
  price?: number | null;
  /** 家のお酒（買った瓶）から記録したときの、その瓶の id */
  bottleId?: string;
  /** 家で飲んだときの飲み方メモ。後から増やした項目なので古い記録にはない */
  serveNote?: ServeNote;
  /** この記録について AI に聞いたこと */
  qa?: QA[];
  memo: string;
  photo: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type RecordDraft = Omit<TastingRecord, "id" | "createdAt" | "updatedAt" | "overall"> & {
  overall: Score | null;
};

/** 家で飲むために買ったお酒（瓶・缶）。何回かに分けて記録できる */
export interface Bottle {
  id: string;
  name: string;
  kind: Kind | null;
  style: string | null;
  maker: string;
  origin: string;
  /** ラベルや AI の説明など */
  note: string;
  /** 買った値段（円） */
  price: number | null;
  /** 買った日 YYYY-MM-DD */
  boughtAt: string;
  /** 飲みきったら true */
  finished: boolean;
  createdAt: number;
}
