import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { timingSafeEqual } from "node:crypto";
import { COCKTAIL_REFERENCE } from "@/lib/cocktails";
import { CHOOSING_TIPS, TERMS } from "@/lib/glossary";
import { FoodMenuSchema, FoodPairingSchema } from "@/lib/foodPairing";
import { MenuScanResultSchema, PairingResultSchema, TermLookupSchema } from "@/lib/menuScan";

// 名前で調べてネット検索までしたときは時間がかかるので、待ち時間の上限を長めにする
export const maxDuration = 60;

// 料金を抑えるため一番安いモデルを使う。変えたいときは環境変数 MENU_MODEL で上書き
const MODEL = process.env.MENU_MODEL || "claude-haiku-5-5";
// 端末側で縮小済みの JPEG を想定。大きすぎる画像は課金がかさむので断る
const MAX_IMAGE_BASE64 = 1_500_000;
// 名前で調べるときの文字数の上限
const MAX_QUERY = 60;
// 料理との相性を見るときの、料理名の文字数とお酒の数の上限
const MAX_DISH = 40;
const MAX_PAIRING_DRINKS = 40;

/** 名前で調べたお酒をよく知らないとき、解説の先頭に付けさせる言葉。「名前からの推測」が入っていたらネットで調べ直す */
const GUESS_MARK = "詳しい情報が見つからなかったので、名前からの推測です。";

const SYSTEM = `あなたはお酒の初心者に、お酒を解説するアシスタントです。
渡されるのは次のどれかです。
- 居酒屋・バー・レストランのお酒のメニュー写真：載っているお酒ごとに情報を取り出す。料理やソフトドリンクは含めない
- 瓶・缶・箱のラベル写真：写っているお酒（ふつうは1本）の情報をラベルから読み取る。裏ラベルの原材料・精米歩合・アルコール度数・蔵元・産地も手がかりにする
- お酒の名前：そのお酒1つについて答える。「ネットで調べた情報」が付いていれば、それを優先して使う
メニューにお酒がたくさん載っているときは、目立つもの・お酒らしいものから最大12本までにしてください（多すぎると読み切れないため）。
蔵元・産地・タイプは、写真に書かれていなくても、有名な銘柄で確かにわかる場合だけ入れてください。自信がなければ空文字か null にしてください。
「味の予想」「おすすめの飲み方」「合う料理」「飲み方ごとの違い」「度数」は、説明・種類・タイプ・銘柄から推定して必ず埋めてください。複数あるときは違いがわかるよう、相対的に付けてください。度数は書いてあればその値（abvStated=true）、なければおおよその値（abvStated=false）にしてください。
名前で調べたお酒が、調べた情報にもなく、よく知らないときは、名前から推測できる範囲で答え、解説の最初に「${GUESS_MARK}」と書いてください。名前がお酒でなければ空配列にしてください。
解説とおすすめは、次の用語集と選び方の目安に沿って、やさしい日本語で書いてください。

## 用語集
${TERMS.map((t) => `- ${t.term}（${t.category}）: ${t.description}`).join("\n")}

## 選び方の目安
${CHOOSING_TIPS.map((t) => `- ${t}`).join("\n")}

## よくあるカクテル（度数と作り方の目安。メニューにあれば参考にする）
${COCKTAIL_REFERENCE}`;

/**
 * お酒の名前をネットで調べて、わかったことをメモにする。
 * 検索結果を受け取る呼び出しと、決まった形で答えさせる呼び出しは分ける（検索の引用と形式指定を一緒に使わないため）。
 * 検索が使えないとき（Console で無効など）は空文字を返し、モデルの知識だけで答える
 */
async function searchNotes(client: Anthropic, query: string) {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      // 1回あたり約1.5円かかるので、2回までに抑える
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 2,
          user_location: { type: "approximate", country: "JP", timezone: "Asia/Tokyo" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `「${query}」というお酒について、ネットで調べて次をわかる範囲で箇条書きにしてください：正式な名前、種類とタイプ（純米吟醸、赤ワイン、IPA など）、蔵元・醸造所、産地、アルコール度数、精米歩合や原料・品種、味や香りの特徴、おすすめの飲み方。見つからなかった項目は書かないでください。`,
        },
      ],
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("web search failed", e.status, e.message);
    else console.error("web search failed", e);
    return "";
  }
}

// 記録について AI に聞くときの、質問・記録の要約の文字数と、続けて聞くときに渡す前の質問の数
const MAX_ASK = 300;
const MAX_CONTEXT = 1500;
const MAX_HISTORY = 4;

const ASK_SYSTEM = `あなたはお酒にくわしい、やさしい案内役です。利用者が自分の記録（飲んだお酒の感想）や、メニュー・ラベルで見つけたお酒の情報を見ながら質問します。
その内容をふまえて、初心者にもわかる日本語で、3〜6文くらいで具体的に答えてください。飲み方の質問には温度や割り方の比率などの数字も入れてください。
見出しや箇条書きの記号（#、*、-）は使わず、ふつうの文章で答えてください。わからないことは推測だと言ってください。`;

// 日本語の合言葉も使えるよう、空白・全角/半角・カタカナ/ひらがな・大文字/小文字の揺れをそろえて比べる
// （「アイ」と「あい」、「ABC」と「abc」を同じとみなす）
function foldPasscode(s: string) {
  return s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function passcodeOK(given: unknown) {
  const expected = process.env.APP_PASSCODE;
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(foldPasscode(given));
  const b = Buffer.from(foldPasscode(expected));
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

  const client = new Anthropic();

  // 記録を見ながら AI に質問する（文字だけなので安い）
  if (typeof body?.ask === "string") {
    const ask = body.ask.trim();
    const context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT) : "";
    if (!ask || ask.length > MAX_ASK) return error(400, `質問は${MAX_ASK}文字までで入れてください`);
    const history: { q: string; a: string }[] = Array.isArray(body.history)
      ? body.history
          .filter((h: unknown): h is { q: string; a: string } => {
            const x = h as Record<string, unknown>;
            return typeof x?.q === "string" && typeof x?.a === "string";
          })
          .slice(-MAX_HISTORY)
          .map((h: { q: string; a: string }) => ({ q: h.q.slice(0, MAX_ASK), a: h.a.slice(0, 1500) }))
      : [];
    const turns = [...history, { q: ask, a: "" }];
    const messages: Anthropic.MessageParam[] = turns.flatMap((t, i) => {
      const q = i === 0 ? `## 見ているもの\n${context}\n\n## 質問\n${t.q}` : t.q;
      return t.a ? [{ role: "user" as const, content: q }, { role: "assistant" as const, content: t.a }] : [{ role: "user" as const, content: q }];
    });
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: ASK_SYSTEM,
        output_config: { effort: "low" },
        messages,
      });
      const answer = response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("")
        .trim();
      if (!answer) return error(422, "うまく答えられませんでした。聞き方を変えてみてください");
      return Response.json({ answer });
    } catch (e) {
      return apiError(e);
    }
  }

  // 辞典に足したい言葉を調べる（文字だけなので安い）
  if (typeof body?.term === "string") {
    const term = body.term.trim();
    if (!term || term.length > MAX_QUERY) return error(400, "調べたい言葉を入れてください");
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: `あなたはお酒の初心者向け辞典の編集者です。次の用語集と同じ書き方で、やさしい日本語で説明してください。\n\n${TERMS.slice(0, 12)
          .map((t) => `- ${t.term}（${t.category}）: ${t.description}`)
          .join("\n")}`,
        output_config: { effort: "low", format: zodOutputFormat(TermLookupSchema) },
        messages: [{ role: "user", content: `「${term}」という言葉を辞典に足したいです。説明してください。` }],
      });
      const out = response.parsed_output;
      if (!out?.found) return error(404, "お酒の言葉として見つかりませんでした。書き方を変えて試してみてください");
      return Response.json(out);
    } catch (e) {
      return apiError(e);
    }
  }

  // 食べている料理か今日の気分と、読み取り済みのお酒の相性（文字だけなので安い）
  // 料理のメニューや料理の写真から、載っている料理ごとに合うお酒を選ぶ
  if (typeof body?.foodImage === "string") {
    const image = body.foodImage;
    if (image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
    const likes = typeof body.likes === "string" ? body.likes.slice(0, 200) : "";
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 6000,
        system: "あなたはお酒と料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。",
        output_config: { effort: "low", format: zodOutputFormat(FoodMenuSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text: `料理のメニューか、料理そのものの写真です。載っている（写っている）料理それぞれに、いちばん合うお酒を1つずつ、日本酒・ワイン・ビール・ウイスキー・焼酎・その他（梅酒やカクテルなど）から選んでください。${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
              },
            ],
          },
        ],
      });
      const parsed = response.parsed_output;
      if (!parsed) return error(422, "うまく読み取れませんでした");
      if (parsed.dishes.length === 0) return error(422, "料理が見つかりませんでした。メニューや料理が写るように撮ってみてください");
      return Response.json(parsed);
    } catch (e) {
      return apiError(e);
    }
  }

  // 料理・食べ物から、合うお酒を選ぶ（メニューがなくても使える。文字だけなので安い）
  if (typeof body?.food === "string") {
    const food = body.food.trim();
    if (!food || food.length > MAX_DISH) return error(400, "料理の名前を入れてください");
    const likes = typeof body.likes === "string" ? body.likes.slice(0, 200) : "";
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: "あなたはお酒と料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。",
        output_config: { effort: "low", format: zodOutputFormat(FoodPairingSchema) },
        messages: [
          {
            role: "user",
            content: `「${food}」に合うお酒を3つ選んでください。日本酒・ワイン・ビール・ウイスキー・焼酎・その他（梅酒やカクテルなど）から、種類が重ならないように、合う順に選んでください。${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
          },
        ],
      });
      const parsed = response.parsed_output;
      if (!parsed) return error(422, "うまく判断できませんでした");
      if (!parsed.found || parsed.picks.length === 0) return error(422, "料理や食べ物の名前を入れてください");
      return Response.json(parsed);
    } catch (e) {
      return apiError(e);
    }
  }

  if (typeof body?.dish === "string" || typeof body?.mood === "string") {
    const isMood = typeof body?.mood === "string";
    const dish = String(isMood ? body.mood : body.dish).trim();
    const drinks = Array.isArray(body.drinks) ? body.drinks.slice(0, MAX_PAIRING_DRINKS) : [];
    if (!dish || dish.length > MAX_DISH) return error(400, isMood ? "気分を入れてください" : "料理の名前を入れてください");
    if (drinks.length === 0) return error(400, "お酒がありません");
    const list = drinks
      .map((d: Record<string, unknown>, i: number) =>
        `${i}. ${[d.name, d.kind, d.style].filter((x) => typeof x === "string" && x).join(" / ")}`.slice(0, 120),
      )
      .join("\n");
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: "あなたはお酒と料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。",
        output_config: { effort: "low", format: zodOutputFormat(PairingResultSchema) },
        messages: [
          {
            role: "user",
            content: isMood
              ? `今日の気分は「${dish}」です。次のお酒それぞれについて、この気分にどれくらい合うかを付けてください（score は相性と同じ1〜5、reason はなぜ合う・合わないか）。全部のお酒に付け、違いがわかるよう相対的に付けてください。\n\n${list}`
              : `いま「${dish}」を食べています。次のお酒それぞれについて、この料理との相性を付けてください。全部のお酒に付け、違いがわかるよう相対的に付けてください。\n\n${list}`,
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく判断できませんでした");
      return Response.json(response.parsed_output);
    } catch (e) {
      return apiError(e);
    }
  }

  // 写真（メニューやラベル）か、お酒の名前のどちらかを受け取る
  const image = body?.image;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (query && query.length > MAX_QUERY) return error(413, "名前が長すぎます");
  if (!query) {
    if (typeof image !== "string" || image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
  }

  const ask = async (content: Anthropic.ContentBlockParam[]) => {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(MenuScanResultSchema) },
      messages: [{ role: "user", content }],
    });
    return response.stop_reason === "refusal" ? null : response.parsed_output;
  };

  try {
    let result;
    if (query) {
      const askAbout = (notes = "") =>
        ask([
          {
            type: "text",
            text: `「${query}」というお酒について解説してください。${notes ? `\n\n## ネットで調べた情報\n${notes}` : ""}`,
          },
        ]);
      // まず AI の知識だけで答えさせ（安い）、知らないお酒のときだけネットで調べ直す（1回数円）
      result = await askAbout();
      if (result?.drinks.some((d) => d.explanation.includes("名前からの推測"))) {
        const notes = await searchNotes(client, query);
        if (notes) result = (await askAbout(notes)) ?? result;
      }
    } else {
      result = await ask([
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: "この写真（メニューまたはラベル）のお酒を読み取って解説してください。" },
      ]);
    }

    if (!result) return error(422, "うまく読み取れませんでした。もう一度撮ってみてください");
    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}

function apiError(e: unknown) {
  // 答えが長すぎて途中で切れ、形を読み取れなかったとき（メニューのお酒が多いときに起きやすい）
  if (e instanceof Anthropic.AnthropicError && e.message.startsWith("Failed to parse")) {
    console.error("read-menu parse error", e.message.slice(0, 200));
    return error(422, "お酒が多すぎて読み切れませんでした。メニューを半分ずつ撮ってみてください");
  }
  if (e instanceof Anthropic.RateLimitError) return error(429, "混み合っています。少し待ってからもう一度お試しください");
  if (e instanceof Anthropic.AuthenticationError) return error(503, "API キーが正しくないようです");
  if (e instanceof Anthropic.APIError) {
    console.error("read-menu API error", e.status, e.message);
    return error(502, "読み取りに失敗しました（利用上限に達した可能性があります）");
  }
  // 思いがけない失敗でも、画面に理由を出せるよう JSON で返す
  console.error("read-menu unexpected error", e);
  return error(500, "読み取りに失敗しました。もう一度お試しください");
}
