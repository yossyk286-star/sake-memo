import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { timingSafeEqual } from "node:crypto";
import { CHOOSING_TIPS, TERMS } from "@/lib/glossary";
import { MenuScanResultSchema } from "@/lib/menuScan";

// 料金を抑えるため一番安いモデルを使う。変えたいときは環境変数 MENU_MODEL で上書き
const MODEL = process.env.MENU_MODEL || "claude-haiku-5-5";
// 端末側で縮小済みの JPEG を想定。大きすぎる画像は課金がかさむので断る
const MAX_IMAGE_BASE64 = 1_500_000;
// 名前で調べるときの文字数の上限
const MAX_QUERY = 60;

const SYSTEM = `あなたはお酒の初心者に、お酒を解説するアシスタントです。
渡されるのは次のどれかです。
- 居酒屋・バー・レストランのお酒のメニュー写真：載っているお酒ごとに情報を取り出す。料理やソフトドリンクは含めない
- 瓶・缶・箱のラベル写真：写っているお酒（ふつうは1本）の情報をラベルから読み取る。裏ラベルの原材料・精米歩合・アルコール度数・蔵元・産地も手がかりにする
- お酒の名前：そのお酒1つについて、知っている範囲で答える
蔵元・産地・タイプは、写真に書かれていなくても、有名な銘柄で確かにわかる場合だけ入れてください。自信がなければ空文字か null にしてください。
「味の予想」「おすすめの飲み方」「合う料理」「飲み方ごとの違い」は、説明・種類・タイプ・銘柄から推定して必ず埋めてください。複数あるときは違いがわかるよう、相対的に付けてください。
名前で調べたお酒をよく知らないときは、名前から推測できる範囲で答え、解説の最初に「詳しい情報が見つからなかったので、名前からの推測です。」と書いてください。名前がお酒でなければ空配列にしてください。
解説とおすすめは、次の用語集と選び方の目安に沿って、やさしい日本語で書いてください。

## 用語集
${TERMS.map((t) => `- ${t.term}（${t.category}）: ${t.description}`).join("\n")}

## 選び方の目安
${CHOOSING_TIPS.map((t) => `- ${t}`).join("\n")}`;

function passcodeOK(given: unknown) {
  const expected = process.env.APP_PASSCODE;
  if (!expected || typeof given !== "string") return false;
  // 日本語の合言葉も使えるよう、前後の空白と全角/半角の揺れをそろえて比べる
  const a = Buffer.from(given.trim().normalize("NFKC"));
  const b = Buffer.from(expected.trim().normalize("NFKC"));
  return a.length === b.length && timingSafeEqual(a, b);
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.APP_PASSCODE) {
    return error(503, "読み取り機能の設定がまだです（API キーと合言葉を登録してください）");
  }

  const body = await req.json().catch(() => null);
  if (!passcodeOK(body?.passcode)) return error(401, "合言葉が違います");

  // 写真（メニューやラベル）か、お酒の名前のどちらかを受け取る
  const image = body?.image;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  let content: Anthropic.ContentBlockParam[];
  if (query) {
    if (query.length > MAX_QUERY) return error(413, "名前が長すぎます");
    content = [{ type: "text", text: `「${query}」というお酒について解説してください。` }];
  } else {
    if (typeof image !== "string" || image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
    content = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
      { type: "text", text: "この写真（メニューまたはラベル）のお酒を読み取って解説してください。" },
    ];
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(MenuScanResultSchema) },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return error(422, "うまく読み取れませんでした。もう一度撮ってみてください");
    }
    return Response.json(response.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return error(429, "混み合っています。少し待ってからもう一度お試しください");
    if (e instanceof Anthropic.AuthenticationError) return error(503, "API キーが正しくないようです");
    if (e instanceof Anthropic.APIError) {
      console.error("read-menu API error", e.status, e.message);
      return error(502, "読み取りに失敗しました（利用上限に達した可能性があります）");
    }
    throw e;
  }
}
