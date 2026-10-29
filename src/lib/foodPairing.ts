import { z } from "zod";
import { KINDS, STYLES_BY_KIND } from "./glossary";
import { nameKey } from "./savedLookups";
import type { Bottle, Kind, TastingRecord } from "./types";

/** 料理に合うお酒1つ分 */
export const FoodPickSchema = z.object({
  kind: z.enum(KINDS).describe("お酒の種類"),
  style: z
    .string()
    .describe(
      `タイプ。種類ごとに次から選ぶ：${KINDS.map((k) => `${k}=${STYLES_BY_KIND[k].join("/")}`).join("、")}。どれでもなければ空文字`,
    ),
  title: z.string().describe("おすすめを短く（例：辛口の純米酒をぬる燗で、軽めの赤ワイン）。20字くらいまで"),
  reason: z.string().describe("なぜこの料理に合うか、初心者にもわかるように1〜2文で"),
  examples: z.string().describe("お店や酒屋で探しやすい銘柄・品種の例を2つくらい（例：黒龍、ピノ・ノワール）。思いつかなければ空文字"),
});

/** 料理・食べ物から選んだ、合うお酒 */
export const FoodPairingSchema = z.object({
  found: z.boolean().describe("料理・食べ物・おつまみとして判断できれば true。食べ物でなければ false"),
  dish: z.string().describe("料理名（表記をととのえたもの）"),
  tip: z.string().describe("この料理にお酒を合わせるときのコツを1文で（例：タレなら甘みとコクのあるお酒、塩ならすっきりしたお酒）"),
  picks: z.array(FoodPickSchema).describe("合うお酒を合う順に3つ。種類が重ならないようにする"),
});

export type FoodPick = z.infer<typeof FoodPickSchema>;
export type FoodPairing = Omit<z.infer<typeof FoodPairingSchema>, "found">;

const p = (kind: Kind, style: string, title: string, reason: string, examples = ""): FoodPick => ({
  kind,
  style,
  title,
  reason,
  examples,
});

/** よく食べる料理は、AI を呼ばずに出せるよう内蔵しておく（0円・電波がなくても使える） */
const BUILT_IN: { words: RegExp; pairing: FoodPairing }[] = [
  {
    words: /焼き?鳥|やきとり|つくね|ねぎま/,
    pairing: {
      dish: "焼き鳥",
      tip: "タレなら甘みとコクのあるお酒、塩ならすっきりしたお酒が合います。",
      picks: [
        p("日本酒", "純米", "純米酒をぬる燗で", "米の旨みが鶏の脂やタレの甘辛さを包みこみます。温めると香ばしさとも合います。", "菊正宗 純米、神亀"),
        p("ビール", "ラガー", "キンキンのラガー", "炭酸と苦味が脂を流して、次の一本がまたおいしくなります。"),
        p("ワイン", "赤", "軽めの赤ワイン", "タレやレバーのコクに、軽めの赤の果実味と渋みがよく合います。", "ピノ・ノワール、マスカット・ベーリーA"),
      ],
    },
  },
  {
    words: /刺身|さしみ|お造り|寿司|すし|鮨|海鮮|カルパッチョ/,
    pairing: {
      dish: "刺身・寿司",
      tip: "魚の繊細な味を消さない、香りおだやかでキレのあるお酒が合います。",
      picks: [
        p("日本酒", "純米吟醸", "冷やした純米吟醸", "すっきりした旨みが魚の甘みを引き立て、生臭さを感じにくくします。", "八海山、くどき上手"),
        p("ワイン", "白", "辛口の白ワイン", "さわやかな酸味がレモンを搾ったように魚を軽くします。", "甲州、シャブリ"),
        p("ワイン", "スパークリング", "辛口のスパークリング", "泡と酸味で脂ののったサーモンやトロもさっぱり食べられます。", "カヴァ"),
      ],
    },
  },
  {
    words: /天ぷら|てんぷら|天麩羅|フライ|フリット/,
    pairing: {
      dish: "天ぷら",
      tip: "油をさっぱり流す、泡や酸味のあるお酒が合います。",
      picks: [
        p("ワイン", "スパークリング", "辛口のスパークリング", "泡が衣の油を流して、塩で食べる天ぷらにもぴったりです。", "カヴァ、甲州スパークリング"),
        p("日本酒", "本醸造", "キレのある本醸造を冷やで", "軽くてキレがよいので、揚げ物でも重くなりません。"),
        p("焼酎", "麦", "麦焼酎のソーダ割り", "香ばしさと炭酸で、口の中がすっきりします。", "いいちこ、二階堂"),
      ],
    },
  },
  {
    words: /唐揚げ|からあげ|唐揚|フライドチキン|チキン南蛮|とんかつ|カツ/,
    pairing: {
      dish: "唐揚げ・揚げ物",
      tip: "ジューシーな肉の脂には、炭酸でシュワっと流せるお酒がいちばん。",
      picks: [
        p("ウイスキー", "ブレンデッド", "ハイボール", "炭酸と軽い香りで脂を流し、レモンを搾るとさらに合います。", "角瓶、デュワーズ"),
        p("ビール", "ラガー", "生ビール", "定番の組み合わせ。苦味と泡が油をリセットします。"),
        p("ワイン", "ロゼ", "辛口のロゼ", "赤と白の間の味わいで、肉にも衣にもちょうどよく合います。"),
      ],
    },
  },
  {
    words: /餃子|ぎょうざ|ギョーザ|焼売|シュウマイ|小籠包|春巻/,
    pairing: {
      dish: "餃子",
      tip: "にんにくやたれの強い味には、炭酸や苦味でさっぱりさせるのが合います。",
      picks: [
        p("ビール", "ラガー", "冷えたラガー", "肉汁とにんにくを、苦味と炭酸がすっきり流します。"),
        p("その他", "サワー", "レモンサワー", "酸味で口の中がさっぱりして、たれの味も引き立ちます。"),
        p("焼酎", "米", "米焼酎のソーダ割り", "おだやかな甘みで、餃子の皮やあんの旨みに寄りそいます。", "白岳"),
      ],
    },
  },
  {
    words: /焼肉|やきにく|カルビ|ハラミ|ホルモン|ジンギスカン/,
    pairing: {
      dish: "焼肉",
      tip: "脂とタレの強い味には、渋みや炭酸のしっかりしたお酒が負けません。",
      picks: [
        p("ワイン", "赤", "しっかりした赤ワイン", "渋み（タンニン）が肉の脂をやわらげ、タレのコクとも合います。", "カベルネ・ソーヴィニヨン、シラー"),
        p("ビール", "ラガー", "生ビール", "脂っこさを炭酸で流して、どんどん食べられます。"),
        p("焼酎", "芋", "芋焼酎のロック", "香ばしい芋の香りが、焼いた肉の香りと重なります。", "黒霧島"),
      ],
    },
  },
  {
    words: /ステーキ|ローストビーフ|ハンバーグ|牛肉|ビーフ|ラム/,
    pairing: {
      dish: "ステーキ・肉料理",
      tip: "肉の旨みと脂には、渋みとコクのある重めのお酒が合います。",
      picks: [
        p("ワイン", "赤", "フルボディの赤ワイン", "濃い果実味と渋みが、赤身の旨みと脂を引き立てます。", "カベルネ・ソーヴィニヨン、マルベック"),
        p("ウイスキー", "バーボン", "バーボンのロック", "樽の甘い香りが、焼いた肉の香ばしさとよく合います。", "メーカーズマーク"),
        p("日本酒", "特別純米", "コクのある純米酒を常温で", "米の旨みとコクが、和風ソースのステーキに寄りそいます。"),
      ],
    },
  },
  {
    words: /ピザ|ピッツァ|パスタ|スパゲッティ|ナポリタン|ラザニア|トマト/,
    pairing: {
      dish: "ピザ・パスタ",
      tip: "トマトの酸味には、同じく酸味のあるイタリアの赤がよく合います。",
      picks: [
        p("ワイン", "赤", "軽めの赤ワイン", "トマトとチーズに、果実味と酸味がぴったり。", "キャンティ（サンジョヴェーゼ）"),
        p("ビール", "ペールエール", "ペールエール", "フルーティーな香りとほどよい苦味が、チーズの塩気に合います。"),
        p("ワイン", "白", "白ワイン", "クリーム系やシーフードのパスタなら、白のほうが合います。", "ソーヴィニヨン・ブラン"),
      ],
    },
  },
  {
    words: /チーズ|カマンベール|ブルーチーズ|チェダー/,
    pairing: {
      dish: "チーズ",
      tip: "やわらかいチーズは白や泡、固いチーズは赤、青カビは甘口が合います。",
      picks: [
        p("ワイン", "赤", "赤ワイン", "熟成した固いチーズのコクに、赤の渋みと果実味が合います。"),
        p("ワイン", "甘口", "甘口ワイン", "ブルーチーズの塩気に甘さが合わさると、デザートのような味に。", "ソーテルヌ、ポートワイン"),
        p("日本酒", "純米", "熟成感のある純米酒", "米の旨みとチーズの発酵の旨みが重なります。意外と合う組み合わせです。"),
      ],
    },
  },
  {
    words: /牡蠣|かき|カキ|オイスター|貝|ホタテ|あさり/,
    pairing: {
      dish: "牡蠣・貝",
      tip: "磯の香りには、酸味とミネラル感のある辛口が合います。",
      picks: [
        p("ワイン", "白", "辛口の白ワイン", "生牡蠣の定番。酸味が磯の香りをさわやかにします。", "シャブリ、ミュスカデ"),
        p("日本酒", "純米", "辛口の純米酒", "貝の旨みと米の旨みが重なり、酒蒸しにもよく合います。"),
        p("ビール", "スタウト", "スタウト", "アイルランドでは牡蠣と黒ビールが定番。コクが牡蠣の濃さに合います。"),
      ],
    },
  },
  {
    words: /おでん|煮物|肉じゃが|筑前煮|湯豆腐|鍋|すき焼き|しゃぶしゃぶ/,
    pairing: {
      dish: "おでん・煮物・鍋",
      tip: "だしの味には、温めた日本酒や焼酎のお湯割りがほっとする組み合わせです。",
      picks: [
        p("日本酒", "本醸造", "熱燗", "温かいだしと燗酒は、体があたたまる鉄板の組み合わせです。"),
        p("日本酒", "純米", "純米酒をぬる燗で", "米の旨みとだしの旨みが重なり、やさしい味わいに。"),
        p("焼酎", "麦", "麦焼酎のお湯割り", "香ばしく軽いので、だしの味を消しません。"),
      ],
    },
  },
  {
    words: /焼き?魚|塩焼き|干物|さんま|サンマ|鮭|さば|サバ|ぶり|ブリ|うなぎ/,
    pairing: {
      dish: "焼き魚",
      tip: "塩焼きはすっきりした日本酒、照り焼きや蒲焼きはコクのあるお酒が合います。",
      picks: [
        p("日本酒", "本醸造", "辛口の日本酒を常温で", "キレのよさが魚の脂をさっぱりさせます。"),
        p("日本酒", "特別純米", "特別純米をぬる燗で", "焼いた香ばしさと、温めた米の旨みがよく合います。"),
        p("焼酎", "芋", "芋焼酎のお湯割り", "蒲焼きや照り焼きの甘辛いタレに、芋の甘い香りが合います。"),
      ],
    },
  },
  {
    words: /カレー|麻婆|エスニック|タイ料理|ガパオ|スパイス|キムチ|辛い|激辛/,
    pairing: {
      dish: "カレー・辛い料理",
      tip: "辛さには、冷たくて軽いお酒や、少し甘みのあるお酒が口をやわらげます。",
      picks: [
        p("ビール", "ラガー", "冷えたラガー", "辛さを冷たさと炭酸ですっきり流します。"),
        p("ビール", "IPA", "IPA", "ホップの苦味と柑橘の香りが、スパイスの香りと引き立て合います。"),
        p("ワイン", "白", "やや甘口の白ワイン", "ほのかな甘さが辛さをやわらげます。", "リースリング、ゲヴュルツトラミネール"),
      ],
    },
  },
  {
    words: /中華|酢豚|エビチリ|回鍋肉|青椒肉絲|炒飯|チャーハン|北京ダック/,
    pairing: {
      dish: "中華料理",
      tip: "油と濃い味には、紹興酒やすっきりしたお酒で口をリセットするのが合います。",
      picks: [
        p("その他", "", "紹興酒", "中華の定番。熟成したコクと香りが、濃い味と油に合います。ロックや燗でも。"),
        p("ビール", "ラガー", "冷えたラガー", "油っこさを炭酸ですっきり流します。"),
        p("ウイスキー", "ブレンデッド", "ハイボール", "軽い香りと炭酸で、炒め物やあんかけにも合います。"),
      ],
    },
  },
  {
    words: /枝豆|えだまめ|冷奴|やっこ|ポテト|ナッツ|漬物|おつまみ|塩辛|珍味/,
    pairing: {
      dish: "おつまみ",
      tip: "軽いおつまみには、すっきり軽めで飲みやすいお酒が合います。",
      picks: [
        p("ビール", "ラガー", "ラガー", "塩気のあるおつまみと、のどごしのよいビールは間違いない組み合わせ。"),
        p("日本酒", "吟醸", "冷やした吟醸酒", "軽やかな香りで、冷奴や漬物の繊細な味に合います。"),
        p("その他", "梅酒", "梅酒のソーダ割り", "甘酸っぱさで、塩辛や珍味の塩気がまろやかに感じられます。"),
      ],
    },
  },
  {
    words: /チョコ|ケーキ|デザート|スイーツ|甘いもの|あんこ|和菓子|ドライフルーツ/,
    pairing: {
      dish: "チョコ・甘いもの",
      tip: "甘いものには、同じくらいの甘さか、香りの強いお酒が合います。",
      picks: [
        p("ウイスキー", "シングルモルト", "シングルモルトをストレートで", "チョコのほろ苦さに、樽の甘い香りが重なります。少しずつ。"),
        p("ワイン", "甘口", "甘口ワイン", "ケーキやドライフルーツの甘さと、ワインの甘さがなじみます。"),
        p("日本酒", "にごり", "にごり酒", "お米の甘さととろみが、和菓子やあんこに合います。"),
      ],
    },
  },
];

/** 内蔵している料理（入力のヒントに出す） */
export const BUILT_IN_DISHES = BUILT_IN.map((b) => b.pairing.dish);

export function builtInPairing(dish: string): FoodPairing | null {
  const q = dish.trim();
  return BUILT_IN.find((b) => b.pairing.dish === q || b.words.test(q))?.pairing ?? null;
}

// AI に聞いた結果は端末に残し、同じ料理なら AI を呼ばずに出す
const KEY = "sake-memo:pairings";
const MAX = 100;

type Saved = Record<string, { pairing: FoodPairing; at: number }>;

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function findSavedPairing(dish: string) {
  return load()[nameKey(dish)]?.pairing ?? null;
}

export function savePairing(query: string, pairing: FoodPairing) {
  const all = load();
  const at = Date.now();
  all[nameKey(query)] = { pairing, at };
  all[nameKey(pairing.dish)] = { pairing, at };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}

/** 前に調べた料理（新しい順） */
export function recentPairings(limit: number) {
  const seen = new Set<string>();
  return Object.values(load())
    .sort((a, b) => b.at - a.at)
    .map((s) => s.pairing.dish)
    .filter((d) => !seen.has(d) && seen.add(d))
    .slice(0, limit);
}

export type MineMatch<T> = { item: T; why: string; score: number };

/** そのお酒（記録や家の瓶）が、おすすめのどれかと同じ種類・タイプか */
function matchPick(d: { kind: Kind | null; style: string | null }, picks: FoodPick[]) {
  const style = picks.find((p) => d.kind === p.kind && !!p.style && d.style === p.style);
  if (style) return { score: 3, why: `同じ${style.kind}・${style.style}` };
  const kind = picks.find((p) => d.kind === p.kind);
  if (kind) return { score: 1, why: `${kind.kind}は合わせやすい種類` };
  return null;
}

/** 合わせた料理の欄に、この料理が書いてあるか（表記ゆれをそろえて、どちらかがどちらかを含めば） */
function ateWith(r: TastingRecord, dish: string, query: string) {
  const a = nameKey(r.pairing);
  if (!a) return false;
  return [dish, query].map(nameKey).some((b) => b && (a.includes(b) || b.includes(a)));
}

/** 自分の記録から、この料理に合いそうなお酒。前に一緒に飲んで好評だったもの、同じタイプで評価の高いものの順 */
export function matchRecords(records: TastingRecord[], pairing: FoodPairing, query: string, limit = 3) {
  const best = new Map<string, MineMatch<TastingRecord>>();
  for (const r of records) {
    if (r.overall < 3) continue;
    const ate = ateWith(r, pairing.dish, query);
    const m = matchPick(r, pairing.picks);
    if (!ate && !m) continue;
    // 種類が同じだけのものは、評価が高いときだけ出す
    if (!ate && m!.score < 3 && r.overall < 4) continue;
    const score = (ate ? 4 : 0) + (m?.score ?? 0) + (r.overall - 3) * 0.6;
    const why = ate ? `前に「${r.pairing.trim()}」と合わせて★${r.overall}` : `${m!.why}で★${r.overall}`;
    const key = nameKey(r.name) || r.id;
    if ((best.get(key)?.score ?? -1) < score) best.set(key, { item: r, why, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** 家にある（飲みきっていない）お酒から、この料理に合いそうなもの */
export function matchBottles(bottles: Bottle[], pairing: FoodPairing, limit = 2) {
  return bottles
    .filter((b) => !b.finished)
    .map((b) => {
      const m = matchPick(b, pairing.picks);
      return m && { item: b, why: m.why, score: m.score + (b.low ? -0.5 : 0) };
    })
    .filter((m): m is MineMatch<Bottle> => !!m)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
