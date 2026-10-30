import { z } from "zod";
import type { Kind, RecordDraft } from "./types";
import { CATEGORIES, KINDS, STYLES_BY_KIND } from "./glossary";

/** 味の強さ。1（弱い）〜5（強い） */
const TasteLevel = z.number().int().describe("1（弱い）〜5（強い）の整数");

/** メニューやラベルの写真、または名前から調べたお酒1つ分 */
export const ScannedDrinkSchema = z.object({
  name: z.string().describe("お酒の名前・銘柄（例：獺祭 純米大吟醸45、シャブリ）"),
  kind: z.enum(KINDS).nullable().describe("お酒の種類。判断できなければ null"),
  style: z
    .string()
    .describe(
      `タイプ。種類ごとに次から選ぶ：${KINDS.map((k) => `${k}=${STYLES_BY_KIND[k].join("/")}`).join("、")}。書かれていない・判断できなければ空文字`,
    ),
  maker: z.string().describe("蔵元・醸造所・ワイナリー・蒸溜所の名前。わからなければ空文字"),
  origin: z.string().describe("産地（日本なら都道府県名、海外なら国名）。わからなければ空文字"),
  menuNote: z.string().describe("メニューやラベルに書かれている味や香りの説明をそのまま。なければ空文字"),
  explanation: z.string().describe("このお酒がどんな味か、初心者向けに2〜3文で"),
  recommendedServe: z.string().describe("いちばんおすすめの飲み方（冷酒、ぬる燗、ロック、ハイボール、よく冷やして など）"),
  recommendation: z.string().describe("おすすめの飲み方を理由つきで1〜2文"),
  pairing: z.string().describe("合いそうな料理・おつまみを1文で"),
  abv: z
    .number()
    .nullable()
    .describe(
      "アルコール度数（%）。ラベルやメニューに書いてあればその値、なければ種類・タイプ・銘柄から推定したおおよその値（例：日本酒15、ビール5、ワイン12、ウイスキー40、焼酎25）",
    ),
  abvStated: z.boolean().describe("度数がラベルやメニューに書かれていれば true、推定なら false"),
  taste: z
    .object({
      sweetness: TasteLevel.describe("甘さ（1=辛口、5=甘口）"),
      acidity: TasteLevel.describe("酸味"),
      body: TasteLevel.describe("コク（口当たりの重さ）"),
      aroma: TasteLevel.describe("香りの華やかさ"),
    })
    .describe("味の予想。メニューの説明・種類・タイプ・銘柄から推定して必ず埋める"),
  serveNotes: z
    .array(
      z.object({
        // 表示するだけなので、自由な表記でも読み取りを失敗させない
        serve: z.string().describe("飲み方"),
        note: z.string().describe("その飲み方だとどんな味になるか、1文"),
      }),
    )
    .describe("このお酒に合う飲み方2〜3通りの味の違い（ビールやワインなど飲み方の選択肢がなければ空配列）"),
});

export const MenuScanResultSchema = z.object({
  drinks: z.array(ScannedDrinkSchema).describe("見つかったお酒。お酒が写っていない・お酒の名前でなければ空配列"),
});

export type ScannedDrink = z.infer<typeof ScannedDrinkSchema>;
export type DrinkTaste = ScannedDrink["taste"];
export type MenuScanResult = z.infer<typeof MenuScanResultSchema>;

/** 読み取ったタイプが、その種類で選べるものならそのまま、違えば null */
function styleOf(kind: Kind | null, style: string) {
  if (!kind || !style) return null;
  return STYLES_BY_KIND[kind].includes(style) ? style : null;
}

/** 読み取ったお酒を記録フォームの値に変換する */
export function drinkToDraft(
  d: ScannedDrink,
): Pick<RecordDraft, "name" | "maker" | "origin" | "kind" | "style" | "serve" | "menuNote" | "abv"> {
  return {
    name: d.name,
    maker: d.maker,
    origin: d.origin,
    kind: d.kind,
    style: styleOf(d.kind, d.style),
    serve: d.recommendedServe || null,
    menuNote: d.menuNote,
    // 前の版で調べた結果には度数がない
    abv: d.abv ?? null,
  };
}

/** 食べている料理との相性。お酒は送った順の番号で返す */
export const PairingResultSchema = z.object({
  ranks: z.array(
    z.object({
      index: z.number().int().describe("お酒の番号（0から）"),
      score: z.number().int().describe("料理との相性。1（合わない）〜5（とても合う）"),
      reason: z.string().describe("なぜ合う・合わないか、20〜40字くらいで"),
    }),
  ),
});

export type PairingResult = z.infer<typeof PairingResultSchema>;

/** 料理メニューをまだ読み取っていないとき、このお酒に合う料理を AI に挙げてもらう */
export const DishIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      dish: z.string().describe("料理の名前。お店でよく見かける名前で"),
      score: z.number().int().describe("相性。3（合う）〜5（とても合う）"),
      reason: z.string().describe("なぜ合うか、20〜40字くらいで"),
    }),
  ),
});

export type DishIdeas = z.infer<typeof DishIdeasSchema>;

/** 辞典に足す用語を調べた結果 */
export const TermLookupSchema = z.object({
  found: z.boolean().describe("お酒に関係する言葉として説明できれば true。関係ない・わからなければ false"),
  term: z.string().describe("用語（表記をととのえたもの）"),
  reading: z.string().describe("ひらがなの読み。カタカナ語や英語なら空文字"),
  category: z.enum(CATEGORIES).describe("いちばん近い分類"),
  description: z.string().describe("初心者向けのやさしい説明。辞典のほかの用語と同じく2文くらい、60〜100字"),
});

export type TermLookup = z.infer<typeof TermLookupSchema>;
