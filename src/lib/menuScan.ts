import { z } from "zod";
import type { Kind, RecordDraft } from "./types";
import { KINDS, STYLES_BY_KIND } from "./glossary";

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
): Pick<RecordDraft, "name" | "maker" | "origin" | "kind" | "style" | "serve" | "menuNote"> {
  return {
    name: d.name,
    maker: d.maker,
    origin: d.origin,
    kind: d.kind,
    style: styleOf(d.kind, d.style),
    serve: d.recommendedServe || null,
    menuNote: d.menuNote,
  };
}
