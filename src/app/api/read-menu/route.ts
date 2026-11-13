import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { timingSafeEqual } from "node:crypto";
import { COCKTAIL_REFERENCE } from "@/lib/cocktails";
import { CHOOSING_TIPS, TERMS } from "@/lib/glossary";
import { nameKey } from "@/lib/savedLookups";
import {
  FoodMenuSchema,
  FoodPairingSchema,
  MenuListSchema,
  MenuScanResultSchema,
  PairingResultSchema,
  DishIdeasSchema,
  TermLookupSchema,
  SpecResultSchema,
} from "@/lib/schemas";

// 名前で調べてネット検索までしたときや、品の多いメニューを全部読むときは時間がかかるので、待ち時間の上限を長めにする
export const maxDuration = 120;

// 料金を抑えるため一番安いモデルを使う。変えたいときは環境変数 MENU_MODEL で上書き
const MODEL = process.env.MENU_MODEL || "claude-haiku-5-5";
// 写真から文字を読むときだけ使うモデル。読み違いが多いときは環境変数 READ_MODEL でより強いモデル（例：claude-sonnet-5-5）にできる
const READ_MODEL = process.env.READ_MODEL || MODEL;
// 写真を読むときの考える量。料金を抑えるため low（上げたいときは "medium" に。1回0.2円ほど増えて数秒遅くなる）
const READ_EFFORT = "low" as const;
// 端末側で長辺2576px・360万画素までに縮小済みの JPEG を想定。Vercel の受け取り上限（4.5MB）に収まるよう、それより大きい画像は断る
const MAX_IMAGE_BASE64 = 4_000_000;

/** 写真から文字を読むときの注意。読み間違いを減らすため、メニュー・ラベルの読み取りで共通に使う */
const READING_RULES = `
## 写真の文字の読み方（大事）
- 名前は写真に書いてある通りに、一字ずつ正確に書き写してください。似た字（例：獺と瀬、﨑と崎、髙と高）や旧字体・異体字もそのままにし、言い換えたり有名な似た名前に直したりしないでください。
- 縦書き、手書き、黒板、斜めや暗い写真、光の反射、瓶の丸みで字がゆがんだ写真もあります。行や列を取り違えないよう、1つの名前は同じ行（縦書きなら同じ列）から読んでください。
- 名前の横の値段・量・産地・説明は名前に含めないでください。ただし「純米大吟醸」「生酛」などのタイプや、「45」のような数字が銘柄名の一部なら含めてください。
- 一部がかすれたり隠れたりして読めないときは、推測で埋めず、読めた部分だけを使ってください。名前がほとんど読めないものは入れないでください。

- ラベルやメニューのロゴには、筆文字・草書や崩し字・太い毛筆・デザインされた飾り文字・金や銀の箔押し・浮き出し文字・英字の筆記体（cursive / script）など、読みにくい書体がよくあります。字の形を一画ずつ見て読んでください。
- ロゴの字が読みにくいときは、同じ写真の読みやすい小さい字に同じ名前がないか探して確かめてください（裏ラベルの品目・製造者の欄、蔵元名・ワイナリー名・蒸溜所名、ふりがな、ローマ字や英語の表記、首掛けや箱の文字など）。小さい字で確かめられたら、そちらの書き方を使ってください。
- それでも崩し字が読みにくいときは、知っている実在の銘柄名と字の形を照らし合わせてもかまいません。ただし字の形がはっきり合うときだけにし、形が合わない字を有名な名前に寄せないでください。
- 英語・フランス語・イタリア語・ドイツ語などの名前は、つづり・アクセント記号（é, è, ü, ñ など）・アポストロフィ・ハイフンもそのまま書き写してください。筆記体や細い飾り文字では rn と m、cl と d、l と I と 1、u と n、O と 0 などを取り違えやすいので、1文字ずつ確かめてください。ワインやウイスキーの年号・熟成年数（2018、12 Years Old など）・格付け（Grand Cru など）が名前の一部なら含めてください。
- 名前は書いてある文字のまま入れてください。英字の名前はカタカナに直さず英字のまま、カタカナ・漢字の名前は英字に直さずそのままにしてください。
- 同じものがメニューの別の場所に2回載っていても、1つにまとめてください。`;
// 名前で調べるときの文字数の上限
const MAX_QUERY = 60;
// 料理との相性を見るときの、料理名の文字数とお酒の数の上限
const MAX_DISH = 40;
const MAX_PAIRING_DRINKS = 40;
// 写真から書き出したお酒の解説を、何本ずつに分けて同時に書かせるか（1回の答えを短くして、途中で切れたり時間切れになったりしないように）
const EXPLAIN_CHUNK = 5;
// 1枚の写真から読むお酒の上限（ふつうのメニューなら届かない。答えが長くなりすぎないための安全弁）
const MAX_MENU_DRINKS = 60;
// 端末に解説が残っているお酒として受け取る名前の数の上限（端末に残すのは300件まで）
const MAX_KNOWN = 300;

/** 名前で調べたお酒をよく知らないとき、解説の先頭に付けさせる言葉。「名前からの推測」が入っていたらネットで調べ直す */
const GUESS_MARK = "詳しい情報が見つからなかったので、名前からの推測です。";
const GUESS_MARK_EN = "No detailed information was found, so this is a guess based on the name.";

/**
 * 英語で使っている人向けの追加の指示。文章は英語で書かせ、アプリが日本語で見分けている項目（種類・タイプ・産地・飲み方）は
 * 日本語のまま返させる（画面ではアプリが訳して出す。産地スタンプや好みの照合もそのまま使える）
 */
const ENGLISH_NOTE = `

## Language (important)
The user reads English and may be travelling in Japan. Ignore any instruction above about writing in Japanese: write every free-text field (explanations, recommendations, reasons, tips, titles, notes, descriptions, answers) in natural, beginner-friendly English.
Keep these fields in the Japanese vocabulary exactly as the schema describes, because the app matches and translates them itself: kind, style, origin (Japanese prefecture name or country name in Japanese katakana/kanji), recommendedServe, serve, category.
Drink names and dish names: keep the name as written on the menu or label so it can be shown to the staff; if it is not written in the Latin alphabet, add the romanized reading and a short English gloss in parentheses, e.g. 獺祭 純米大吟醸45 (Dassai Junmai Daiginjo 45), 焼き鳥 (Yakitori, grilled chicken skewers).
Menus and labels may be written in English or any other language; read them as they are.
If you were asked to start an explanation with "${GUESS_MARK}", start it with "${GUESS_MARK_EN}" instead.`;

const SYSTEM = `あなたはお酒の初心者に、お酒を解説するアシスタントです。
渡されるのは次のどれかです。
- 居酒屋・バー・レストランのお酒のメニュー写真：載っているお酒ごとに情報を取り出す。料理やソフトドリンクは含めない
- 瓶・缶・箱のラベル写真：写っているお酒（ふつうは1本）の情報をラベルから読み取る。裏ラベルの原材料・精米歩合・アルコール度数・蔵元・産地も手がかりにする
- お酒の名前：そのお酒1つについて答える。「ネットで調べた情報」が付いていれば、それを優先して使う
蔵元・産地・タイプは、写真に書かれていなくても、有名な銘柄で確かにわかる場合だけ入れてください。自信がなければ空文字か null にしてください。
「味の予想」「おすすめの飲み方」「合う料理」「飲み方ごとの違い」「度数」は、説明・種類・タイプ・銘柄から推定して必ず埋めてください。複数あるときは違いがわかるよう、相対的に付けてください。度数は書いてあればその値（abvStated=true）、なければおおよその値（abvStated=false）にしてください。
名前で調べたお酒が、調べた情報にもなく、よく知らないときは、名前から推測できる範囲で答え、解説の最初に「${GUESS_MARK}」と書いてください。名前がお酒でなければ空配列にしてください。
解説とおすすめは、次の用語集と選び方の目安に沿って、やさしい日本語で書いてください。
${READING_RULES}

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

/** 料理との相性を見るときの役割（料理の写真・料理名・お酒1杯から・料理や気分との相性で共通） */
const PAIR_SYSTEM = "あなたはお酒と料理の組み合わせにくわしい、やさしい案内役です。初心者にもわかる日本語で答えてください。";

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

// 合言葉を当てずっぽうで試され続けないよう、同じ接続元からの間違いは15分で10回までにする
// shortcut: Vercel でサーバーが複数動くと数はサーバーごと。それでも破られるなら Vercel KV などで数える
const FAIL_WINDOW = 15 * 60_000;
const MAX_FAILS = 10;
const fails = new Map<string, { n: number; since: number }>();

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.APP_PASSCODE) {
    return error(503, "読み取り機能の設定がまだです（API キーと合言葉を登録してください）");
  }

  const body = await req.json().catch(() => null);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const fail = fails.get(ip);
  const recent = fail && now - fail.since < FAIL_WINDOW ? fail : null;
  if (recent && recent.n >= MAX_FAILS) return error(429, "合言葉を何度も間違えたので、15分ほど待ってからお試しください");
  if (!passcodeOK(body?.passcode)) {
    if (fails.size > 1000) fails.clear();
    fails.set(ip, recent ? { n: recent.n + 1, since: recent.since } : { n: 1, since: now });
    return error(401, "合言葉が違います");
  }
  fails.delete(ip);

  const client = new Anthropic();
  // 英語で使っているときは、AI にも英語で答えさせる
  const english = body?.lang === "en";
  const sys = (text: string) => (english ? text + ENGLISH_NOTE : text);

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
      return t.a
        ? [
            { role: "user" as const, content: q },
            { role: "assistant" as const, content: t.a },
          ]
        : [{ role: "user" as const, content: q }];
    });
    // 画面に書かれていくように見せるため、届いた分から少しずつ送る（最初の1つが届くまでの失敗はいつも通り JSON で返す）
    if (body.stream === true) {
      try {
        const it = client.messages
          .stream({ model: MODEL, max_tokens: 1500, system: sys(ASK_SYSTEM), output_config: { effort: "low" }, messages })
          [Symbol.asyncIterator]();
        const textOf = (ev: Anthropic.MessageStreamEvent) => (ev.type === "content_block_delta" && ev.delta.type === "text_delta" ? ev.delta.text : "");
        // 最初の文字が届くまで待つ（ここまでの失敗は apiError で理由を返す）
        let first = "";
        for (let r = await it.next(); !r.done; r = await it.next()) {
          first = textOf(r.value);
          if (first) break;
        }
        if (!first) return error(422, "うまく答えられませんでした。聞き方を変えてみてください");
        const enc = new TextEncoder();
        const out = new ReadableStream<Uint8Array>({
          async start(c) {
            c.enqueue(enc.encode(first));
            try {
              for (let r = await it.next(); !r.done; r = await it.next()) {
                const t = textOf(r.value);
                if (t) c.enqueue(enc.encode(t));
              }
              c.close();
            } catch (e) {
              console.error("ask stream error", e);
              c.error(e);
            }
          },
        });
        return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      } catch (e) {
        return apiError(e);
      }
    }
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: sys(ASK_SYSTEM),
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
        system: sys(
          `あなたはお酒の初心者向け辞典の編集者です。次の用語集と同じ書き方で、やさしい日本語で説明してください。\n\n${TERMS.slice(0, 12)
            .map((t) => `- ${t.term}（${t.category}）: ${t.description}`)
            .join("\n")}`,
        ),
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

  // 裏ラベルからスペック（精米歩合・日本酒度など）を読む（12）
  if (typeof body?.specImage === "string") {
    const image = body.specImage;
    if (image.length === 0) return error(400, "写真がありません");
    if (image.length > MAX_IMAGE_BASE64) return error(413, "写真が大きすぎます");
    try {
      const response = await client.messages.parse({
        model: READ_MODEL,
        max_tokens: 1500,
        system: sys(
          `あなたはお酒のラベルを読む係です。写真に書いてある項目と値だけを、そのまま書き写してください。書いていないことは推測で足さないでください。${READING_RULES}`,
        ),
        output_config: { effort: READ_EFFORT, format: zodOutputFormat(SpecResultSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              { type: "text", text: "このお酒の裏ラベル（または表ラベル）から、原材料・精米歩合・日本酒度・酸度などのスペックを読み取ってください。" },
            ],
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく読み取れませんでした。もう一度撮ってみてください");
      return Response.json(response.parsed_output);
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
        model: READ_MODEL,
        max_tokens: 16000,
        system: sys(PAIR_SYSTEM),
        output_config: { effort: READ_EFFORT, format: zodOutputFormat(FoodMenuSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text: `料理のメニューか、料理そのものの写真です。載っている（写っている）料理は、数が多くても1品も飛ばさずに全部入れてください。小さい字・端の列・別の枠・おすすめの黒板なども見落とさないでください。それぞれの料理に、いちばん合うお酒を1つずつ、日本酒・ワイン・ビール・ウイスキー・焼酎・その他（梅酒やカクテルなど）から選んでください。同じお酒で合う料理はなるべく同じ種類・タイプにそろえ、全体で2〜4種類にしぼってください。title には料理名を入れず、お酒の特徴だけを短く書いてください（例：キレのあるラガー）。料理が多いときは reason を1文に短くしてください。\n${READING_RULES}${likes ? `\n\n利用者の好み（合うものの中から、なるべく好みに寄せる）：${likes}` : ""}`,
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
        system: sys(PAIR_SYSTEM),
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

  // 逆向き：1杯のお酒に、読み取った料理メニューのどれが合うか
  if (body?.drink && typeof body.drink === "object" && Array.isArray(body?.dishes)) {
    const d = body.drink as Record<string, unknown>;
    const name = [d.name, d.kind, d.style]
      .filter((x) => typeof x === "string" && x)
      .join(" / ")
      .slice(0, 120);
    const dishes = (body.dishes as unknown[])
      .filter((x): x is string => typeof x === "string" && !!x.trim())
      .slice(0, MAX_PAIRING_DRINKS)
      .map((x) => x.trim().slice(0, MAX_DISH));
    if (!name) return error(400, "お酒がありません");
    try {
      if (dishes.length === 0) {
        const response = await client.messages.parse({
          model: MODEL,
          max_tokens: 2000,
          system: sys(PAIR_SYSTEM),
          output_config: { effort: "low", format: zodOutputFormat(DishIdeasSchema) },
          messages: [
            {
              role: "user",
              content: `いま「${name}」を飲んでいます。居酒屋や飲食店のメニューでよく見かける料理から、このお酒に合うものを合う順に5つ挙げてください。`,
            },
          ],
        });
        if (!response.parsed_output) return error(422, "うまく判断できませんでした");
        return Response.json(response.parsed_output);
      }

      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: sys(PAIR_SYSTEM),
        output_config: { effort: "low", format: zodOutputFormat(PairingResultSchema) },
        messages: [
          {
            role: "user",
            content: `いま「${name}」を飲んでいます。次の料理それぞれについて、このお酒との相性を付けてください（index は料理の番号）。全部の料理に付け、違いがわかるよう相対的に付けてください。\n\n${dishes.map((x, i) => `${i}. ${x}`).join("\n")}`,
          },
        ],
      });
      if (!response.parsed_output) return error(422, "うまく判断できませんでした");
      return Response.json(response.parsed_output);
    } catch (e) {
      return apiError(e);
    }
  }

  if (typeof body?.dish === "string" || typeof body?.mood === "string") {
    const isMood = typeof body?.mood === "string";
    const dish = String(isMood ? body.mood : body.dish).trim();
    const drinks: Record<string, unknown>[] = Array.isArray(body.drinks)
      ? body.drinks.filter((d: unknown) => d && typeof d === "object").slice(0, MAX_PAIRING_DRINKS)
      : [];
    if (!dish || dish.length > MAX_DISH) return error(400, isMood ? "気分を入れてください" : "料理の名前を入れてください");
    if (drinks.length === 0) return error(400, "お酒がありません");
    const list = drinks.map((d, i) => `${i}. ${[d.name, d.kind, d.style].filter((x) => typeof x === "string" && x).join(" / ")}`.slice(0, 120)).join("\n");
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: sys(PAIR_SYSTEM),
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

  // 文字だけで解説を書かせる（名前で調べるとき・写真から書き出したお酒の解説）
  const ask = async (content: Anthropic.ContentBlockParam[]) => {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      // 解説の呼び出しどうしで長い説明文（用語集など）を使い回し、2回目からの読み込み料金を1割にする
      system: [{ type: "text", text: sys(SYSTEM), cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: zodOutputFormat(MenuScanResultSchema) },
      messages: [{ role: "user", content }],
    });
    return response.stop_reason === "refusal" ? null : response.parsed_output;
  };

  /**
   * 写真のお酒を全部読む。1回目は写真から名前と書いてあることだけを全部書き出し（答えが短いので品が抜けない）、
   * 2回目は書き出したお酒を何本かずつに分けて、文字だけで解説を同時に書かせる
   */
  const readPhoto = async (data: string, known: Set<string>) => {
    const listed = await client.messages.parse({
      model: READ_MODEL,
      max_tokens: 12000,
      system: sys(SYSTEM),
      output_config: { effort: READ_EFFORT, format: zodOutputFormat(MenuListSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            {
              type: "text",
              text: "この写真（メニューまたはラベル）に載っているお酒を、数が多くても1本も飛ばさずに全部書き出してください。解説はまだ書かず、名前と写真に書いてあることだけを入れてください。メニューは上から下、右から左（横書きなら左から右）へ、すべての行・列・枠・ページ・小さい字・手書きの追加・黒板まで順に見てください。グラスとボトルなど同じお酒が量違いで並んでいるときは1つにまとめてください。毛筆のロゴの下や横に小さいふりがなや地名があれば、それで名前を確かめてください（「県外のお酒」などの見出しも見落とさないでください）。名前はまず写真の字を一字ずつ確かめてから書いてください。",
            },
          ],
        },
      ],
    });
    if (listed.stop_reason === "refusal" || !listed.parsed_output) return null;
    const items = listed.parsed_output.drinks.slice(0, MAX_MENU_DRINKS);
    if (items.length === 0) return { drinks: [] };

    // 前にこの端末で解説まで出したお酒は解説を書かせず、端末に残っている解説を使ってもらう（known を付けて返す）
    const isKnown = (d: (typeof items)[number]) => known.has(nameKey(d.name));
    const fresh = items.filter((d) => !isKnown(d));
    const chunks: (typeof items)[] = [];
    for (let i = 0; i < fresh.length; i += EXPLAIN_CHUNK) chunks.push(fresh.slice(i, i + EXPLAIN_CHUNK));
    const explainChunk = async (chunk: typeof items) => {
      const lines = chunk.map((d, i) => `${i}. ${JSON.stringify(d)}`).join("\n");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const out = await ask([
            {
              type: "text",
              text: `メニューやラベルの写真から読み取ったお酒です（JSON、写真に書いてあったことだけ）。この${chunk.length}本を、同じ順番で1本ずつ全部解説してください。名前（name）・読み・蔵元・産地・メニューの説明は、書いてある通りにそのまま使い、変えないでください。facts は写真に書いてあった手がかりなので、解説に使ってください。度数（abv）が null なら推定してください。\n\n${lines}`,
            },
          ]);
          if (out?.drinks.length) return out.drinks;
        } catch (e) {
          if (attempt === 1) console.error("read-menu explain error", e instanceof Error ? e.message.slice(0, 200) : e);
        }
      }
      return [];
    };
    // 最初の組を先に送り、説明文の使い回しが用意できたころに残りを同時に送る（全部同時だと使い回せない）
    const first = chunks.length ? explainChunk(chunks[0]) : Promise.resolve([]);
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 1500));
    const explained = await Promise.all([first, ...chunks.slice(1).map(explainChunk)]);

    // 写真から読んだこと（名前・度数など）を優先し、解説は2回目の答えから付ける。解説が付かなかったお酒も名前だけは残す
    const exFor = new Map(chunks.flatMap((chunk, c) => chunk.map((d, i) => [d, explained[c].find((x) => x.name === d.name) ?? explained[c][i]] as const)));
    const drinks = items.map((d) => {
      const ex = exFor.get(d);
      return {
        ...(isKnown(d) ? { known: true } : {}),
        name: d.name,
        reading: d.reading,
        kind: d.kind ?? ex?.kind ?? null,
        style: d.style || ex?.style || "",
        maker: d.maker || ex?.maker || "",
        origin: d.origin || ex?.origin || "",
        menuNote: d.menuNote,
        explanation: ex?.explanation ?? "",
        recommendedServe: ex?.recommendedServe ?? "",
        recommendation: ex?.recommendation ?? "",
        pairing: ex?.pairing ?? "",
        abv: d.abv ?? ex?.abv ?? null,
        abvStated: d.abv != null,
        taste: ex?.taste ?? { sweetness: 3, acidity: 3, body: 3, aroma: 3 },
        serveNotes: ex?.serveNotes ?? [],
      };
    });
    return { drinks };
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
      if (result?.drinks.some((d) => d.explanation.includes("名前からの推測") || d.explanation.startsWith(GUESS_MARK_EN))) {
        const notes = await searchNotes(client, query);
        if (notes) result = (await askAbout(notes)) ?? result;
      }
    } else {
      // 端末に解説が残っているお酒の名前（多すぎるときは先頭から）
      const known = new Set<string>(
        (Array.isArray(body?.known) ? body.known : [])
          .filter((n: unknown): n is string => typeof n === "string" && n.length <= 80)
          .slice(0, MAX_KNOWN)
          .map(nameKey),
      );
      result = await readPhoto(image, known);
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
