import type { ScannedDrink } from "./menuScan";
import { nameKey } from "./savedLookups";
import { tr } from "./i18n";

/**
 * よくあるカクテル・割りもの。名前で調べたときは AI を呼ばずにここから出す。
 * 度数は一般的なレシピでのおおよその値（店や作り方で変わる）
 */
type Cocktail = {
  name: string;
  /** ほかの呼び方（英語・略称など） */
  aliases: string[];
  base: string;
  abv: number;
  recipe: string;
  explanation: string;
  /** 甘さ・酸味・コク・香り（1〜5） */
  taste: [number, number, number, number];
  pairing: string;
  style?: string;
};

const COCKTAILS: Cocktail[] = [
  // ジン
  { name: "ジントニック", aliases: ["gin tonic", "gin and tonic", "ジントニ"], base: "ジン", abv: 10, recipe: "ジン45ml＋トニックウォーター、ライム", explanation: "ジンの爽やかな香りとトニックのほろ苦さ。甘さ控えめでさっぱり飲める定番。", taste: [2, 2, 1, 4], pairing: "唐揚げ、フライドポテト" },
  { name: "ジンリッキー", aliases: ["gin rickey"], base: "ジン", abv: 10, recipe: "ジン45ml＋ライム果汁＋ソーダ", explanation: "甘くないジンのソーダ割り。ライムでキリッとしていて食事に合わせやすい。", taste: [1, 3, 1, 4], pairing: "焼き鳥（塩）、カルパッチョ" },
  { name: "ギムレット", aliases: ["gimlet"], base: "ジン", abv: 30, recipe: "ジン45ml＋ライムジュース15ml（シェイク）", explanation: "ジンとライムだけの強めのショートカクテル。酸味がシャープで、少量をゆっくり飲む。", taste: [2, 4, 2, 4], pairing: "ナッツ、オリーブ" },
  { name: "マティーニ", aliases: ["martini", "マティニ"], base: "ジン", abv: 35, recipe: "ジン45ml＋ドライベルモット15ml（ステア）、オリーブ", explanation: "「カクテルの王様」。ほぼお酒だけなのでかなり強く、辛口で香りが立つ。", taste: [1, 1, 3, 5], pairing: "オリーブ、生ハム" },
  { name: "ネグローニ", aliases: ["negroni"], base: "ジン", abv: 25, recipe: "ジン・カンパリ・スイートベルモット 各30ml", explanation: "ほろ苦さと甘さが同じくらいの大人のカクテル。度数は高め。", taste: [3, 2, 4, 4], pairing: "チーズ、サラミ" },
  { name: "トムコリンズ", aliases: ["tom collins"], base: "ジン", abv: 10, recipe: "ジン45ml＋レモン果汁＋砂糖＋ソーダ", explanation: "ジンのレモンスカッシュ。甘酸っぱくて飲みやすい。", taste: [3, 3, 1, 3], pairing: "フライ、サラダ" },
  // ウォッカ
  { name: "モスコミュール", aliases: ["moscow mule"], base: "ウォッカ", abv: 10, recipe: "ウォッカ45ml＋ライム＋ジンジャーエール（またはジンジャービア）", explanation: "しょうがのピリッとした辛みとライムの爽やかさ。甘すぎず飲みやすい。", taste: [3, 2, 1, 3], pairing: "餃子、エスニック料理" },
  { name: "スクリュードライバー", aliases: ["screwdriver"], base: "ウォッカ", abv: 12, recipe: "ウォッカ45ml＋オレンジジュース", explanation: "ほぼオレンジジュースの味で、お酒の味がしにくい。飲みすぎに注意。", taste: [4, 3, 1, 2], pairing: "ピザ、サンドイッチ" },
  { name: "ソルティドッグ", aliases: ["salty dog"], base: "ウォッカ", abv: 12, recipe: "ウォッカ45ml＋グレープフルーツジュース、グラスのふちに塩", explanation: "グレープフルーツのほろ苦さと塩気。さっぱりしていて食事にも合う。", taste: [2, 3, 1, 2], pairing: "揚げ物、塩味のおつまみ" },
  { name: "ブラッディメアリー", aliases: ["bloody mary"], base: "ウォッカ", abv: 12, recipe: "ウォッカ45ml＋トマトジュース、レモン、塩・こしょう", explanation: "トマトジュースのカクテル。甘くなく、しょっぱめでスパイシー。", taste: [1, 2, 3, 2], pairing: "ハンバーガー、卵料理" },
  { name: "コスモポリタン", aliases: ["cosmopolitan", "コスモ"], base: "ウォッカ", abv: 22, recipe: "ウォッカ＋ホワイトキュラソー＋クランベリー＋ライム（シェイク）", explanation: "ピンク色で甘酸っぱい。見た目より度数は高め。", taste: [3, 4, 2, 3], pairing: "チーズ、フルーツ" },
  { name: "ホワイトルシアン", aliases: ["white russian"], base: "ウォッカ", abv: 20, recipe: "ウォッカ＋コーヒーリキュール＋生クリーム", explanation: "コーヒー牛乳のような甘さ。飲みやすいが度数は高め。", taste: [5, 1, 4, 3], pairing: "チョコレート、デザート" },
  { name: "ブラックルシアン", aliases: ["black russian"], base: "ウォッカ", abv: 30, recipe: "ウォッカ40ml＋コーヒーリキュール20ml", explanation: "コーヒーの香りと甘さ。量は少ないがかなり強い。", taste: [4, 1, 4, 3], pairing: "チョコレート" },
  // ラム
  { name: "モヒート", aliases: ["mojito"], base: "ラム", abv: 10, recipe: "ラム45ml＋ミント＋ライム＋砂糖＋ソーダ", explanation: "ミントとライムがすっきり。ほんのり甘く、夏にぴったり。", taste: [3, 3, 1, 5], pairing: "タコス、グリル料理" },
  { name: "キューバリブレ", aliases: ["cuba libre", "ラムコーク", "rum coke"], base: "ラム", abv: 12, recipe: "ラム45ml＋コーラ＋ライム", explanation: "ラムのコーラ割り。甘くて飲みやすい。", taste: [4, 2, 2, 3], pairing: "ハンバーガー、BBQ" },
  { name: "ダイキリ", aliases: ["daiquiri"], base: "ラム", abv: 24, recipe: "ラム45ml＋ライム果汁＋砂糖（シェイク）", explanation: "ラム・ライム・砂糖だけのシンプルなショート。甘酸っぱく強め。", taste: [3, 4, 2, 3], pairing: "魚介のフライ" },
  { name: "ピニャコラーダ", aliases: ["pina colada", "piña colada"], base: "ラム", abv: 8, recipe: "ラム＋パイナップルジュース＋ココナッツミルク", explanation: "南国の甘くてまろやかなカクテル。デザートのように飲める。", taste: [5, 2, 4, 4], pairing: "デザート、スパイシーな料理" },
  // テキーラ
  { name: "マルガリータ", aliases: ["margarita"], base: "テキーラ", abv: 26, recipe: "テキーラ30ml＋ホワイトキュラソー15ml＋ライム15ml、ふちに塩", explanation: "塩とライムでキリッとした甘酸っぱさ。度数は高め。", taste: [3, 4, 2, 3], pairing: "タコス、ナチョス" },
  { name: "テキーラサンライズ", aliases: ["tequila sunrise"], base: "テキーラ", abv: 12, recipe: "テキーラ45ml＋オレンジジュース＋グレナデンシロップ", explanation: "朝焼けのような色のグラデーション。オレンジの甘さで飲みやすい。", taste: [4, 3, 1, 2], pairing: "メキシカン、フルーツ" },
  // ウイスキー
  { name: "ハイボール", aliases: ["highball", "ウイスキーソーダ"], base: "ウイスキー", abv: 7, recipe: "ウイスキー30〜45ml＋ソーダ（1:3〜4）", explanation: "ウイスキーのソーダ割り。甘くなく、すっきりしていて食事に合う。", taste: [1, 1, 2, 3], pairing: "唐揚げ、焼き鳥" },
  { name: "ジンジャーハイボール", aliases: ["ジンジャーハイ"], base: "ウイスキー", abv: 7, recipe: "ウイスキー30〜45ml＋ジンジャーエール", explanation: "ハイボールをジンジャーエールで割ったもの。ほんのり甘く飲みやすい。", taste: [3, 1, 2, 3], pairing: "揚げ物、肉料理" },
  { name: "コークハイ", aliases: ["ウイスキーコーク", "whisky coke"], base: "ウイスキー", abv: 7, recipe: "ウイスキー30〜45ml＋コーラ", explanation: "ウイスキーのコーラ割り。甘くてお酒っぽさが少ない。", taste: [4, 1, 2, 2], pairing: "ハンバーガー、ポテト" },
  { name: "ウイスキーサワー", aliases: ["whisky sour", "whiskey sour"], base: "ウイスキー", abv: 15, recipe: "ウイスキー45ml＋レモン果汁＋砂糖（シェイク）", explanation: "ウイスキーの甘酸っぱいカクテル。レモンで飲みやすい。", taste: [3, 4, 2, 3], pairing: "ナッツ、チーズ" },
  { name: "マンハッタン", aliases: ["manhattan"], base: "ウイスキー", abv: 30, recipe: "ウイスキー45ml＋スイートベルモット15ml＋ビターズ", explanation: "「カクテルの女王」。甘くて香り高いが、かなり強い。", taste: [3, 1, 4, 4], pairing: "チョコレート、ナッツ" },
  { name: "オールドファッションド", aliases: ["old fashioned"], base: "ウイスキー", abv: 32, recipe: "ウイスキー45ml＋角砂糖＋ビターズ、オレンジピール", explanation: "ウイスキーをほんのり甘くした強いカクテル。ゆっくり味の変化を楽しむ。", taste: [3, 1, 4, 4], pairing: "ドライフルーツ、チーズ" },
  { name: "ゴッドファーザー", aliases: ["godfather"], base: "ウイスキー", abv: 34, recipe: "ウイスキー45ml＋アマレット15ml", explanation: "杏仁のような甘い香り。飲み口はやさしいが度数はかなり高い。", taste: [4, 1, 4, 4], pairing: "ナッツ、チョコレート" },
  // リキュール（低めの度数）
  { name: "カシスオレンジ", aliases: ["カシオレ", "cassis orange"], base: "カシスリキュール", abv: 5, recipe: "カシスリキュール30ml＋オレンジジュース", explanation: "甘くてジュースのように飲める定番。お酒が弱い人向け。", taste: [5, 3, 1, 3], pairing: "サラダ、フルーツ", style: "リキュール" },
  { name: "カシスソーダ", aliases: ["cassis soda"], base: "カシスリキュール", abv: 5, recipe: "カシスリキュール30ml＋ソーダ", explanation: "カシスの甘酸っぱさをソーダで軽くしたもの。", taste: [4, 3, 1, 3], pairing: "生ハム、チーズ", style: "リキュール" },
  { name: "カシスウーロン", aliases: ["カシウー"], base: "カシスリキュール", abv: 5, recipe: "カシスリキュール30ml＋ウーロン茶", explanation: "甘さをウーロン茶が引き締めて、食事にも合わせやすい。", taste: [3, 2, 1, 3], pairing: "揚げ物、中華", style: "リキュール" },
  { name: "ファジーネーブル", aliases: ["fuzzy navel"], base: "ピーチリキュール", abv: 5, recipe: "ピーチリキュール30ml＋オレンジジュース", explanation: "桃とオレンジの甘いカクテル。ジュース感覚で飲める。", taste: [5, 2, 1, 4], pairing: "フルーツ、デザート", style: "リキュール" },
  { name: "レゲエパンチ", aliases: ["ピーチウーロン", "reggae punch"], base: "ピーチリキュール", abv: 5, recipe: "ピーチリキュール30ml＋ウーロン茶", explanation: "桃の香りとウーロン茶。甘すぎず居酒屋の料理にも合う。", taste: [3, 1, 1, 4], pairing: "唐揚げ、焼き鳥", style: "リキュール" },
  { name: "カルーアミルク", aliases: ["kahlua milk", "カルアミルク"], base: "コーヒーリキュール", abv: 7, recipe: "コーヒーリキュール30ml＋牛乳", explanation: "甘いコーヒー牛乳の味。デザート代わりにも。", taste: [5, 1, 3, 3], pairing: "ケーキ、チョコレート", style: "リキュール" },
  { name: "カンパリソーダ", aliases: ["campari soda"], base: "カンパリ", abv: 7, recipe: "カンパリ30ml＋ソーダ", explanation: "ほろ苦い薬草の香り。甘さ控えめで食前酒向き。", taste: [2, 2, 1, 4], pairing: "オリーブ、前菜", style: "リキュール" },
  { name: "カンパリオレンジ", aliases: ["カンパリオレ"], base: "カンパリ", abv: 7, recipe: "カンパリ30ml＋オレンジジュース", explanation: "オレンジの甘さとカンパリのほろ苦さ。", taste: [3, 3, 1, 3], pairing: "生ハム、前菜", style: "リキュール" },
  { name: "スプモーニ", aliases: ["spumoni"], base: "カンパリ", abv: 5, recipe: "カンパリ30ml＋グレープフルーツジュース＋トニックウォーター", explanation: "ほろ苦くて甘酸っぱい、すっきり軽めのカクテル。", taste: [3, 3, 1, 3], pairing: "サラダ、カルパッチョ", style: "リキュール" },
  { name: "アペロールスプリッツ", aliases: ["aperol spritz", "スプリッツ"], base: "アペロール", abv: 8, recipe: "アペロール＋スパークリングワイン＋ソーダ（3:2:1くらい）", explanation: "オレンジ色の軽い食前酒。ほろ苦さと柑橘の香り。", taste: [3, 3, 1, 4], pairing: "前菜、ポテトチップス", style: "リキュール" },
  // ワイン・ビール
  { name: "ミモザ", aliases: ["mimosa"], base: "スパークリングワイン", abv: 7, recipe: "スパークリングワイン＋オレンジジュース（1:1）", explanation: "泡とオレンジのやさしい甘さ。ブランチの定番。", taste: [3, 3, 1, 3], pairing: "卵料理、サンドイッチ" },
  { name: "キール", aliases: ["kir"], base: "白ワイン", abv: 11, recipe: "白ワイン＋カシスリキュール少し", explanation: "白ワインにカシスで色と甘さを足した食前酒。", taste: [3, 3, 2, 3], pairing: "前菜、チーズ" },
  { name: "キールロワイヤル", aliases: ["kir royal"], base: "シャンパン", abv: 12, recipe: "シャンパン（スパークリングワイン）＋カシスリキュール少し", explanation: "キールを泡で作った華やかな1杯。", taste: [3, 3, 2, 4], pairing: "前菜、生ハム" },
  { name: "ベリーニ", aliases: ["bellini"], base: "スパークリングワイン", abv: 8, recipe: "スパークリングワイン＋桃のピューレ", explanation: "桃の甘い香りと泡。軽くて飲みやすい。", taste: [4, 2, 1, 4], pairing: "フルーツ、前菜" },
  { name: "サングリア", aliases: ["sangria"], base: "ワイン", abv: 8, recipe: "ワインに果物と甘みを漬け込む", explanation: "果物の甘さでワインが飲みやすくなったもの。赤が多い。", taste: [4, 3, 2, 4], pairing: "タパス、パエリア" },
  { name: "シャンディガフ", aliases: ["shandygaff", "シャンディー"], base: "ビール", abv: 2.5, recipe: "ビール＋ジンジャーエール（1:1）", explanation: "ビールの苦みがやわらいで甘め。ビールが苦手な人にも。", taste: [3, 1, 2, 2], pairing: "揚げ物、カレー" },
  { name: "レッドアイ", aliases: ["red eye"], base: "ビール", abv: 2.5, recipe: "ビール＋トマトジュース（1:1）", explanation: "トマトでまろやかになったビール。度数が低め。", taste: [1, 2, 2, 1], pairing: "ソーセージ、ピザ" },
  // 居酒屋の割りもの
  { name: "レモンサワー", aliases: ["レモンチューハイ", "lemon sour"], base: "焼酎・ウォッカなど", abv: 5, recipe: "焼酎など＋レモン果汁＋ソーダ", explanation: "レモンの酸味ですっきり。甘さは店によっていろいろ。", taste: [2, 4, 1, 2], pairing: "唐揚げ、焼き鳥", style: "サワー" },
  { name: "ウーロンハイ", aliases: ["ウーロン割り", "ウーロンハイボール"], base: "焼酎", abv: 7, recipe: "焼酎＋ウーロン茶", explanation: "甘くなく、お茶の香りで脂っこい料理に合う。", taste: [1, 1, 1, 2], pairing: "焼肉、中華", style: "サワー" },
  { name: "緑茶ハイ", aliases: ["緑茶割り", "お茶ハイ"], base: "焼酎", abv: 7, recipe: "焼酎＋緑茶", explanation: "甘くなく、さっぱり。和食に合わせやすい。", taste: [1, 1, 1, 2], pairing: "刺身、天ぷら", style: "サワー" },
  { name: "梅酒ソーダ", aliases: ["梅酒ソーダ割り", "梅ソーダ"], base: "梅酒", abv: 4, recipe: "梅酒＋ソーダ（1:2〜3）", explanation: "梅の甘酸っぱさを炭酸で軽くしたもの。", taste: [4, 3, 1, 3], pairing: "焼き魚、和食", style: "梅酒" },
];

function toDrink(c: Cocktail): ScannedDrink {
  const [sweetness, acidity, body, aroma] = c.taste;
  return {
    name: c.name,
    kind: "その他",
    style: c.style ?? "カクテル",
    maker: "",
    origin: "",
    menuNote: "",
    explanation: tr("{0}（ベース：{1}／作り方：{2}）", c.explanation, c.base, c.recipe),
    recommendedServe: "",
    recommendation: tr("度数は約{0}%。{1}", c.abv, c.abv >= 20 ? "強いので、チェイサー（水）と一緒にゆっくり。" : "飲みやすいので、ペースに気をつけて。"),
    pairing: c.pairing,
    abv: c.abv,
    abvStated: false,
    taste: { sweetness, acidity, body, aroma },
    serveNotes: [],
  };
}

const BY_KEY = new Map<string, Cocktail>();
for (const c of COCKTAILS) for (const n of [c.name, ...c.aliases]) BY_KEY.set(nameKey(n), c);

/** 名前（呼び方の違いも含む）が一致するカクテルがあれば返す */
export function findCocktail(query: string) {
  const c = BY_KEY.get(nameKey(query));
  return c ? toDrink(c) : null;
}

/** 辞典に並べる用 */
export const COCKTAIL_LIST = COCKTAILS.map((c) => ({ ...c, drink: toDrink(c) }));

/** AI にメニューを読ませるときの参考（度数と作り方の目安） */
export const COCKTAIL_REFERENCE = COCKTAILS.map((c) => `- ${c.name}：${c.base}ベース、約${c.abv}%、${c.recipe}`).join("\n");
