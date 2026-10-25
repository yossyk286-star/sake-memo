import type { TastingRecord } from "./types";

type Place = { name: string; aliases: string[] };

const pref = (name: string, ...aliases: string[]): Place => ({ name, aliases });

/** スタンプ帳に並べる産地。日本は都道府県、海外は国。aliases は産地欄に書かれがちな別名や英語 */
export const REGIONS: { region: string; places: Place[] }[] = [
  {
    region: "北海道・東北",
    places: [
      pref("北海道", "hokkaido"),
      pref("青森", "aomori"),
      pref("岩手", "iwate"),
      pref("宮城", "miyagi"),
      pref("秋田", "akita"),
      pref("山形", "yamagata"),
      pref("福島", "fukushima"),
    ],
  },
  {
    region: "関東",
    places: [
      pref("茨城", "ibaraki"),
      pref("栃木", "tochigi"),
      pref("群馬", "gunma"),
      pref("埼玉", "saitama"),
      pref("千葉", "chiba"),
      pref("東京", "東京都", "tokyo"),
      pref("神奈川", "kanagawa"),
    ],
  },
  {
    region: "中部",
    places: [
      pref("新潟", "niigata"),
      pref("富山", "toyama"),
      pref("石川", "ishikawa", "加賀", "能登"),
      pref("福井", "fukui"),
      pref("山梨", "yamanashi"),
      pref("長野", "nagano", "信州"),
      pref("岐阜", "gifu", "飛騨"),
      pref("静岡", "shizuoka"),
      pref("愛知", "aichi"),
    ],
  },
  {
    region: "近畿",
    places: [
      pref("三重", "mie", "伊勢"),
      pref("滋賀", "shiga", "近江"),
      pref("京都", "kyoto", "伏見"),
      pref("大阪", "osaka"),
      pref("兵庫", "hyogo", "灘", "神戸"),
      pref("奈良", "nara"),
      pref("和歌山", "wakayama", "紀州"),
    ],
  },
  {
    region: "中国・四国",
    places: [
      pref("鳥取", "tottori"),
      pref("島根", "shimane"),
      pref("岡山", "okayama"),
      pref("広島", "hiroshima", "西条"),
      pref("山口", "yamaguchi"),
      pref("徳島", "tokushima"),
      pref("香川", "kagawa"),
      pref("愛媛", "ehime"),
      pref("高知", "kochi", "土佐"),
    ],
  },
  {
    region: "九州・沖縄",
    places: [
      pref("福岡", "fukuoka", "博多"),
      pref("佐賀", "saga"),
      pref("長崎", "nagasaki", "壱岐"),
      pref("熊本", "kumamoto", "球磨"),
      pref("大分", "oita"),
      pref("宮崎", "miyazaki"),
      pref("鹿児島", "kagoshima", "薩摩", "奄美"),
      pref("沖縄", "okinawa", "琉球"),
    ],
  },
  {
    region: "海外",
    places: [
      pref("フランス", "france", "ボルドー", "ブルゴーニュ", "シャンパーニュ", "シャブリ", "ロワール", "ローヌ", "アルザス"),
      pref("イタリア", "italy", "italia", "トスカーナ", "ピエモンテ", "キャンティ"),
      pref("スペイン", "spain", "españa", "リオハ", "シェリー", "カバ"),
      pref("ポルトガル", "portugal", "ポートワイン"),
      pref("ドイツ", "germany", "deutschland", "モーゼル"),
      pref("オーストリア", "austria"),
      pref("ベルギー", "belgium"),
      pref("チェコ", "czech"),
      pref("イギリス", "england", "イングランド"),
      pref("スコットランド", "scotland", "スコッチ", "アイラ", "スペイサイド", "ハイランド"),
      pref("アイルランド", "ireland", "アイリッシュ"),
      pref("アメリカ", "america", "カリフォルニア", "ナパ", "オレゴン", "ケンタッキー"),
      pref("カナダ", "canada"),
      pref("チリ", "chile"),
      pref("アルゼンチン", "argentina", "メンドーサ"),
      pref("オーストラリア", "australia"),
      pref("ニュージーランド", "new zealand"),
      pref("南アフリカ", "south africa"),
      pref("台湾", "taiwan"),
    ],
  },
];

const ALL = REGIONS.flatMap((r) => r.places);

// 「東京都」が「京都」に、「南アフリカ」が「アフリカ」に当たらないよう、長い言葉から先に調べる
const WORDS = ALL.flatMap((p) => [p.name, ...p.aliases].map((w) => ({ word: w.toLowerCase(), name: p.name }))).sort(
  (a, b) => b.word.length - a.word.length,
);

/** 産地欄（と蔵元名）から都道府県・国を探す。見つからなければ null */
export function placeOf(r: Pick<TastingRecord, "origin" | "maker">): string | null {
  const text = `${r.origin} ${r.maker}`.toLowerCase();
  return WORDS.find((w) => text.includes(w.word))?.name ?? null;
}

export type Stamp = { count: number; best: number; records: TastingRecord[] };

/** 産地ごとの杯数・最高評価・その産地の記録。リストにない産地は others に産地欄のまま入れる */
export function collectStamps(records: TastingRecord[]) {
  const stamps = new Map<string, Stamp>();
  const others = new Map<string, Stamp>();
  for (const r of records) {
    const place = placeOf(r);
    const key = place ?? r.origin.trim();
    if (!key) continue;
    const map = place ? stamps : others;
    const s = map.get(key) ?? { count: 0, best: 0, records: [] };
    map.set(key, { count: s.count + 1, best: Math.max(s.best, r.overall), records: [...s.records, r] });
  }
  return { stamps, others, total: ALL.length };
}
