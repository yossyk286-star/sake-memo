import { placeOf } from "./origins";
import type { TastingRecord } from "./types";
import { tr } from "./i18n";

/**
 * 相棒（ちっちゃい徳利）が言うひとこと。記録を保存したとき・アプリを開いたときなど。
 * AI は使わず、記録の中身と今までの記録から決まった言葉を選ぶ
 */
export type BuddyMood = "happy" | "normal" | "wow" | "worried" | "sad";
/** action があれば吹き出しにリンクを出す（例：1年前の記録を見る） */
export type BuddyLine = { text: string; mood: BuddyMood; action?: { label: string; href: string } };

const KEY = "sake-memo:buddy";
export const BUDDY_EVENT = "sake-memo:buddy";

/** 相棒を出すかどうか（設定画面で切り替える）。決めていなければ出す */
export function buddyOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setBuddyOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

/** 画面が移っても出せるように、レイアウトにいる <Buddy /> へイベントで渡す */
export function announceBuddy(line: BuddyLine) {
  if (!buddyOn()) return;
  window.dispatchEvent(new CustomEvent<BuddyLine>(BUDDY_EVENT, { detail: line }));
}

export const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function localDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** その日までに何日続けて記録しているか */
function streakDays(dates: Set<string>, last: string) {
  const d = new Date(`${last}T12:00:00`);
  let n = 0;
  while (dates.has(localDate(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const MILESTONES = [10, 30, 50, 100, 200, 300, 500, 1000];

/** 種類・飲み方ごとのひとこと。当てはまるものがなければ ふつうの言葉から選ぶ */
function kindLines(r: TastingRecord): string[] {
  const serve = r.serve ?? "";
  if (/燗/.test(serve))
    return [
      "燗はほっとするね。ぼくもあったまりたい",
      "湯気までおいしそう。熱燗、いいなあ",
      "燗をつけると香りがふくらむんだって。ぬる燗？熱燗？",
    ];
  if (serve === "冷酒") return ["冷酒、のどごしが気持ちいいよね", "冷やすとすっきりキレよく感じるんだって"];
  if (serve === "お湯割り") return ["お湯割り、ほっとするよね", "湯気といっしょに香りが立つね"];
  if (/ロック|水割り|ハイボール|ソーダ/.test(serve) && r.kind !== "日本酒")
    return [
      "氷がカランっていう音、好きなんだ",
      "割ると香りが開くんだって。どうだった？",
      "氷が溶けていくと味も変わるよね。それも楽しみ",
    ];
  switch (r.kind) {
    case "日本酒":
      return [
        "日本酒だ！ぼくの中身と同じだね",
        "お米からこんな味になるの、ふしぎだよね",
        "蔵の名前も覚えておくと楽しいよ",
        "ラベルの「精米歩合」も見てみると楽しいよ",
        "日本酒は温度で味が変わるんだって。冷やも燗も試してみてね",
      ];
    case "ワイン":
      return [
        "ワインかあ、おしゃれ！ぼくは徳利だけど",
        "ぶどうの種類も見ておくと、好みがわかってくるよ",
        "グラスをくるくる回すと香りが立つよ",
        "合わせた料理もメモしておくと、次に選びやすいよ",
      ];
    case "ビール":
      return [
        "かんぱーい！泡もおいしいよね",
        "ビールは1杯目の味が特別だよね",
        "ビールは注ぎ方でも味が変わるんだって",
        "IPA？ラガー？スタイルを覚えると選ぶのが楽しくなるよ",
      ];
    case "ウイスキー":
      return [
        "ウイスキーは香りをゆっくり楽しもう",
        "樽の香り、ぼくも嗅いでみたい",
        "ひとくちずつ、香りの変化を楽しんでね",
        "水を数滴たらすと、香りが開くこともあるよ",
      ];
    case "焼酎":
      return [
        "焼酎は割り方で表情が変わるよね",
        "芋？麦？原料もメモしておくと楽しいよ",
        "お湯割り、水割り、ロック。どれが好き？",
      ];
    case "その他":
      return ["カクテルかな？レシピを覚えておくと家でも作れるよ", "めずらしいお酒だね。どんな味だった？"];
    default:
      return [];
  }
}

const PLAIN = [
  "記録しといたよ！",
  "今日もおつかれさま",
  "いい一杯だったかな？",
  "味のこと、言葉にできるとたのしいね",
  "少しずつ好みが見えてきたね",
  "今日の1杯、ちゃんと覚えたよ",
  "メモが増えるたび、ぼくもうれしいよ",
  "次はどんなお酒に会えるかな",
  "お酒の話、また聞かせてね",
  "ほろ酔いくらいがちょうどいいよね",
];

/** 季節・曜日で混ぜるひとこと */
function seasonLines(now: Date): string[] {
  const m = now.getMonth() + 1;
  const out: string[] = [];
  if (m === 3 || m === 4) out.push("お花見の季節だね。外で飲むお酒もおいしいよ");
  else if (m >= 6 && m <= 8) out.push("暑い日は冷えたお酒がしみるね。お水もしっかりね");
  else if (m === 9 || m === 10) out.push("秋は「ひやおろし」の季節なんだって");
  else if (m === 11) out.push("そろそろ新酒が出はじめる季節だね");
  else out.push("寒い日は燗酒であったまろう");
  if (now.getDay() === 5 || now.getDay() === 6) out.push("週末の1杯、いいね");
  return out;
}

/**
 * 保存した記録へのひとこと。all はこの記録も含めたすべての記録
 * 飲みすぎが心配な日は、ほかより先に心配する
 */
export function buddyLine(
  r: TastingRecord,
  all: TastingRecord[],
  opts: { fromWish?: boolean } = {},
  now = new Date(),
): BuddyLine {
  const others = all.filter((x) => x.id !== r.id);
  const isToday = r.date === localDate(now);
  const sameDay = all.filter((x) => x.date === r.date).length;

  if (isToday && sameDay >= 6)
    return {
      mood: "worried",
      text: pick([
        tr("今日はもう{0}杯目だよ…！今日はここまでにして、お水飲もう？", sameDay),
        tr("{0}杯目…ぼく心配だよ。お水とおつまみ、ちゃんと食べてね", sameDay),
        tr("{0}杯目！今日はもう十分飲んだよ。続きはまた今度にしよう", sameDay),
        tr("ちょっと待って、{0}杯目だよ。帰り道、気をつけてね", sameDay),
      ]),
    };
  if (isToday && sameDay >= 4)
    return {
      mood: "worried",
      text: pick([
        tr("{0}杯目だね。ちょっとペース早いかも。お水はさもう", sameDay),
        tr("楽しいね。でも{0}杯目だから、チェイサーもらおう？", sameDay),
        tr("{0}杯目。ここらでお水を1杯はさむと、明日がらくだよ", sameDay),
        tr("{0}杯目だね。おつまみも食べてる？", sameDay),
      ]),
    };

  if (others.length === 0)
    return {
      mood: "wow",
      text: pick([
        "はじめての記録だね！これからいっしょに飲んだお酒を覚えていくよ",
        "記録ありがとう！今日からぼくが相棒だよ。よろしくね",
        "1杯目の記録だね！好きな味、いっしょに見つけていこう",
      ]),
    };

  if (MILESTONES.includes(all.length))
    return {
      mood: "wow",
      text: pick([
        tr("{0}杯目の記録、おめでとう！ここまで続けてえらいなあ", all.length),
        tr("{0}杯！すごい、ちょっとした記録係だね", all.length),
        tr("記念の{0}杯目！好みの地図がだいぶ描けてきたよ", all.length),
      ]),
    };

  const place = placeOf(r);
  const newPlace = !!place && !others.some((x) => placeOf(x) === place);
  if (opts.fromWish)
    return {
      mood: "wow",
      text: newPlace
        ? pick([
            tr("ついに飲めたね！{0}のスタンプも押しといたよ", place),
            tr("気になってたお酒、ついに！{0}のスタンプも増えたよ", place),
          ])
        : r.name
          ? pick([
              tr("ついに飲めたね！{0}は気になるリストから外しておいたよ", r.name),
              tr("{0}、ずっと気になってたやつだね。気になるリストから外しといたよ", r.name),
            ])
          : pick([tr("ついに飲めたね！気になるリストから外しておいたよ"), tr("念願の1杯だね！気になるリストから外しといたよ")]),
    };

  if (newPlace)
    return {
      mood: "wow",
      text: pick([
        tr("{0}、はじめまして！スタンプ押しといたよ", place),
        tr("{0}のお酒ははじめてだね！スタンプ帳がにぎやかになってきた", place),
        tr("{0}に行った気分だね。スタンプ、ぽん！", place),
      ]),
    };

  if (r.kind && !others.some((x) => x.kind === r.kind))
    return {
      mood: "wow",
      text: pick([
        tr("はじめての{0}！新しい扉だね", r.kind),
        tr("{0}デビューだね！どうだった？", r.kind),
        tr("{0}ははじめて！好みの幅が広がるね", r.kind),
      ]),
    };

  const name = r.name.trim();
  const before = name ? others.filter((x) => x.name.trim() === name) : [];
  if (before.length > 0) {
    const prev = before.reduce((a, b) => (a.date >= b.date ? a : b));
    const n = before.length + 1;
    if (r.overall > prev.overall)
      return {
        mood: "happy",
        text: pick([
          tr("{0}は{1}回目。前より好きになったみたいだね", name, n),
          tr("{0}、{1}回目でもっと好きに。相性がいいのかも", name, n),
        ]),
      };
    if (r.overall < prev.overall)
      return {
        mood: "normal",
        text: pick([
          tr("{0}は{1}回目。前のほうが好みだったかな？飲み方のちがいかも", name, n),
          tr("{0}は{1}回目。今日はいまいちだった？体調や料理でも変わるよね", name, n),
        ]),
      };
    return {
      mood: "happy",
      text: pick([tr("{0}は{1}回目だね。すっかりお気に入り？", name, n), tr("{0}、{1}回目！もう常連さんだね", name, n)]),
    };
  }

  if (r.overall === 5)
    return {
      mood: "happy",
      text: pick([
        "★5！ぼくまでうれしくなっちゃう",
        "最高の1杯だったんだね！名前を覚えておこう",
        "★5いただきました！また会えるといいね",
        "★5、出ました！どこで飲んだかも覚えておこうね",
        "この1杯に会えてよかったね",
      ]),
    };
  if (r.overall <= 2)
    return {
      mood: "sad",
      text: pick([
        "合わなかったかあ。苦手がわかるのも大事な記録だよ",
        "残念だったね。次はきっと好きな1杯に会えるよ",
        "うーん、今日はハズレだったかな。それも思い出だよ",
        "苦手な味がわかると、次の1杯が選びやすくなるよ",
      ]),
    };

  if (isToday && sameDay === 3)
    return { mood: "normal", text: pick(["3杯目だね。お水もいっしょに飲もうね", "3杯目だね。おつまみもちゃんと食べてる？"]) };

  const streak = streakDays(new Set(all.map((x) => x.date)), r.date);
  if (isToday && streak >= 3)
    return {
      mood: "normal",
      text: pick([
        tr("{0}日続けて記録してるね！休肝日もはさんでね", streak),
        tr("{0}日連続だね！たまにはお酒をお休みする日もつくろう", streak),
      ]),
    };

  const hour = now.getHours();
  if (isToday && (hour >= 23 || hour < 4))
    return {
      mood: "normal",
      text: pick([
        "夜ふかしさんだね。あったかくして寝てね",
        "もうこんな時間！お水飲んで、ゆっくり寝てね",
        "夜おそくまでおつかれさま。明日に残らないといいね",
      ]),
    };

  const lines = kindLines(r);
  return {
    mood: "happy",
    text: pick(lines.length > 0 && Math.random() < 0.6 ? lines : [...PLAIN, ...(isToday ? seasonLines(now) : [])]),
  };
}

/** 開いたときのひとことを、どれをいつ出したか覚えておく */
const SEEN_KEY = "sake-memo:buddy-seen";
type Seen = { lastOpen?: string; yearAgo?: string; friday?: string; morning?: string };

function loadSeen(): Seen {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

/**
 * アプリを開いたときのひとこと。出すぎないよう、どれも間をあけて1回だけ
 * - 1年前の今日に記録があれば（1日1回）
 * - 2週間以上あいて開いたら「おかえり」
 * - 前の日に4杯以上飲んだ日の翌朝〜昼（1日1回）
 * - 金曜の夕方から夜（週に1回）
 */
export function openLine(records: TastingRecord[], now = new Date()): BuddyLine | null {
  const today = localDate(now);
  const seen = loadSeen();
  const next: Seen = { ...seen, lastOpen: today };
  let line: BuddyLine | null = null;

  const ago = new Date(now);
  ago.setFullYear(ago.getFullYear() - 1);
  const yearAgo = records.filter((r) => r.date === localDate(ago));
  const gap = seen.lastOpen ? daysBetween(seen.lastOpen, today) : 0;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastNight = records.filter((r) => r.date === localDate(yesterday)).length;

  if (yearAgo.length > 0 && seen.yearAgo !== today) {
    const best = yearAgo.reduce((a, b) => (b.overall > a.overall ? b : a));
    line = {
      mood: "wow",
      text: tr("1年前の今日は「{0}」を飲んでたよ{1}", best.name || best.kind || "お酒", yearAgo.length > 1 ? tr("（ほか{0}杯）", yearAgo.length - 1) : ""),
      action: { label: "見る", href: `/record?id=${best.id}` },
    };
    next.yearAgo = today;
  } else if (gap >= 14) {
    line = {
      mood: "happy",
      text: pick([
        tr("おかえり！{0}日ぶりだね。また一緒に記録しよう", gap),
        tr("ひさしぶり！{0}日ぶりだね。会いたかったよ", gap),
        tr("{0}日ぶり！その間に飲んだお酒、思い出したら書いてね", gap),
      ]),
    };
  } else if (lastNight >= 4 && now.getHours() >= 5 && now.getHours() < 15 && seen.morning !== today) {
    line = {
      mood: "worried",
      text: pick([tr("昨日は{0}杯だったね。体、だいじょうぶ？", lastNight), "昨日はたくさん飲んだね。今日はお水多めでいこう"]),
    };
    next.morning = today;
  } else if (now.getDay() === 5 && now.getHours() >= 17 && (!seen.friday || daysBetween(seen.friday, today) >= 7)) {
    line = {
      mood: "happy",
      text: pick(["金曜の夜だね。今日は何飲む？", "金曜日、おつかれさま！今夜はどこで飲む？", "1週間おつかれさま。今日はごほうびの1杯？"]),
      action: { label: "調べる", href: "/scan" },
    };
    next.friday = today;
  }
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {}
  return line;
}
