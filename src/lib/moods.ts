import type { ScannedDrink } from "./menuScan";

/** 1〜5 にそろえる（AI が範囲外を返したとき用） */
const lv = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

const text = (d: ScannedDrink) =>
  [
    d.name,
    d.kind,
    d.style,
    d.recommendedServe,
    d.explanation,
    ...d.serveNotes.map((n) => n.serve),
  ].join(" ");
const has = (d: ScannedDrink, re: RegExp) => (re.test(text(d)) ? 1 : 0);
/** 度数がわからないときは、種類からだいたいで見る */
const abvOf = (d: ScannedDrink) =>
  d.abv ??
  (
    { ビール: 5, ワイン: 12, 日本酒: 15, 焼酎: 25, ウイスキー: 40 } as Record<
      string,
      number
    >
  )[d.kind ?? ""] ??
  12;

export type Mood = {
  label: string;
  /** 文字で入れたときに、この気分とみなす言葉 */
  words: RegExp;
  score: (d: ScannedDrink) => number;
};

/** 今日の気分。味の予想・度数・飲み方から、その気分に合う順に並べる */
export const MOODS: Mood[] = [
  {
    label: "すっきり",
    words: /すっきり|スッキリ|爽|さわやか|キレ/,
    score: ({ taste: t }) =>
      lv(t.acidity) - 0.7 * lv(t.sweetness) - 0.6 * lv(t.body),
  },
  {
    label: "甘口",
    words: /甘/,
    score: ({ taste: t }) => lv(t.sweetness) + 0.2 * lv(t.aroma),
  },
  {
    label: "辛口",
    words: /辛|ドライ/,
    score: ({ taste: t }) => -lv(t.sweetness) + 0.1 * lv(t.acidity),
  },
  {
    label: "フルーティー",
    words: /フルーツ|フルーティ|果実|果物|ジューシー/,
    score: ({ taste: t }) =>
      lv(t.aroma) + 0.5 * lv(t.sweetness) + 0.3 * lv(t.acidity),
  },
  {
    label: "香り華やか",
    words: /香|華やか|はなやか/,
    score: ({ taste: t }) => lv(t.aroma) + 0.2 * lv(t.sweetness),
  },
  {
    label: "酸味でさっぱり",
    words: /酸|さっぱり|サッパリ/,
    score: ({ taste: t }) => lv(t.acidity) - 0.3 * lv(t.body),
  },
  {
    label: "まろやか",
    words: /まろやか|やさし|優し|やわらか|柔らか|おだやか|穏やか/,
    score: ({ taste: t }) =>
      lv(t.body) + 0.5 * lv(t.sweetness) - 0.5 * lv(t.acidity),
  },
  {
    label: "しっかりコク",
    words: /しっかり|コク|こく|濃|重|飲みごたえ|どっしり/,
    score: ({ taste: t }) => lv(t.body) - 0.2 * lv(t.acidity),
  },
  {
    label: "軽め・弱め",
    words: /軽|弱|低|ゆっくり|ほろ酔い|少しだけ|ちょっとだけ/,
    score: (d) => -abvOf(d) / 5 - 0.3 * lv(d.taste.body),
  },
  {
    label: "強め・酔いたい",
    words: /強|酔|高い|がっつり|ガツン/,
    score: (d) => abvOf(d) / 5 + 0.3 * lv(d.taste.body),
  },
  {
    label: "飲みやすい",
    words: /飲みやす|初心者|苦手|はじめて|初めて|クセがない|癖がない/,
    score: (d) =>
      0.6 * lv(d.taste.sweetness) +
      0.2 * lv(d.taste.aroma) -
      0.3 * lv(d.taste.body) -
      abvOf(d) / 8,
  },
  {
    label: "食事と一緒に",
    words: /食事|ご飯|ごはん|料理|食中|おつまみ|つまみ/,
    score: ({ taste: t }) =>
      -0.5 * lv(t.sweetness) + 0.4 * lv(t.acidity) - 0.2 * lv(t.aroma),
  },
  {
    label: "シュワっと炭酸",
    words: /炭酸|シュワ|しゅわ|泡|ソーダ|スパークリング|ハイボール/,
    score: (d) =>
      3 *
        has(
          d,
          /スパークリング|ビール|ハイボール|サワー|ソーダ|トニック|泡|シャンパン|スプリッツ/,
        ) +
      (d.kind === "ビール" ? 1 : 0),
  },
  {
    label: "あったかいの",
    words: /温|あったか|あたたか|暖|燗|ホット|寒/,
    score: (d) =>
      3 * has(d, /燗|お湯割り|ホット/) +
      (d.kind === "日本酒" || d.kind === "焼酎" ? 1 : 0),
  },
  {
    label: "キンキンに冷たく",
    words: /冷|キンキン|ひんやり|暑|アイス|ロック/,
    score: (d) =>
      2 * has(d, /冷|ロック|ソーダ|ビール|スパークリング|生（樽）/) +
      (d.kind === "ビール" ? 1 : 0),
  },
];

/** 文字で入れた気分を、知っている気分に当てはめる。どれにも当てはまらなければ null（AI に聞く） */
export function moodFromText(input: string): Mood | null {
  const q = input.trim();
  const exact = MOODS.find((m) => m.label === q);
  if (exact) return exact;
  const hit = MOODS.filter((m) => m.words.test(q));
  if (hit.length === 0) return null;
  if (hit.length === 1) return { ...hit[0], label: q };
  return {
    label: q,
    words: /$^/,
    score: (d) => hit.reduce((s, m) => s + m.score(d), 0),
  };
}
