import { placeOf } from "./origins";
import type { TastingRecord } from "./types";

/**
 * 相棒（ちっちゃい徳利）が記録を保存したときに言うひとこと。
 * AI は使わず、記録の中身と今までの記録から決まった言葉を選ぶ
 */
export type BuddyMood = "happy" | "normal" | "wow" | "worried" | "sad";
export type BuddyLine = { text: string; mood: BuddyMood };

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

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function localDate(d: Date) {
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
  if (/燗/.test(serve)) return ["燗はほっとするね。ぼくもあったまりたい", "湯気までおいしそう。熱燗、いいなあ"];
  if (/ロック|水割り|ハイボール|ソーダ/.test(serve) && r.kind !== "日本酒")
    return ["氷がカランっていう音、好きなんだ", "割ると香りが開くんだって。どうだった？"];
  switch (r.kind) {
    case "日本酒":
      return ["日本酒だ！ぼくの中身と同じだね", "お米からこんな味になるの、ふしぎだよね", "蔵の名前も覚えておくと楽しいよ"];
    case "ワイン":
      return ["ワインかあ、おしゃれ！ぼくは徳利だけど", "ぶどうの種類も見ておくと、好みがわかってくるよ"];
    case "ビール":
      return ["かんぱーい！泡もおいしいよね", "ビールは1杯目の味が特別だよね"];
    case "ウイスキー":
      return ["ウイスキーは香りをゆっくり楽しもう", "樽の香り、ぼくも嗅いでみたい"];
    case "焼酎":
      return ["焼酎は割り方で表情が変わるよね", "芋？麦？原料もメモしておくと楽しいよ"];
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
];

/**
 * 保存した記録へのひとこと。all はこの記録も含めたすべての記録
 * 飲みすぎが心配な日は、ほかより先に心配する
 */
export function buddyLine(r: TastingRecord, all: TastingRecord[], now = new Date()): BuddyLine {
  const others = all.filter((x) => x.id !== r.id);
  const isToday = r.date === localDate(now);
  const sameDay = all.filter((x) => x.date === r.date).length;

  if (isToday && sameDay >= 6)
    return {
      mood: "worried",
      text: pick([
        `今日はもう${sameDay}杯目だよ…！今日はここまでにして、お水飲もう？`,
        `${sameDay}杯目…ぼく心配だよ。お水とおつまみ、ちゃんと食べてね`,
      ]),
    };
  if (isToday && sameDay >= 4)
    return {
      mood: "worried",
      text: pick([
        `${sameDay}杯目だね。ちょっとペース早いかも。お水はさもう`,
        `楽しいね。でも${sameDay}杯目だから、チェイサーもらおう？`,
      ]),
    };

  if (others.length === 0)
    return { mood: "wow", text: "はじめての記録だね！これからいっしょに飲んだお酒を覚えていくよ" };

  if (MILESTONES.includes(all.length))
    return { mood: "wow", text: `${all.length}杯目の記録！ここまで続けてえらいなあ` };

  const place = placeOf(r);
  if (place && !others.some((x) => placeOf(x) === place))
    return { mood: "wow", text: `はじめての${place}！スタンプ押しといたよ` };

  const name = r.name.trim();
  const before = name ? others.filter((x) => x.name.trim() === name) : [];
  if (before.length > 0) {
    const prev = before.reduce((a, b) => (a.date >= b.date ? a : b));
    const n = before.length + 1;
    if (r.overall > prev.overall)
      return { mood: "happy", text: `${name}は${n}回目。前より好きになったみたいだね` };
    if (r.overall < prev.overall)
      return { mood: "normal", text: `${name}は${n}回目。前のほうが好みだったかな？飲み方のちがいかも` };
    return { mood: "happy", text: `${name}は${n}回目だね。すっかりお気に入り？` };
  }

  if (r.overall === 5)
    return {
      mood: "happy",
      text: pick([
        "★5！ぼくまでうれしくなっちゃう",
        "最高の1杯だったんだね！名前を覚えておこう",
        "★5いただきました！また会えるといいね",
      ]),
    };
  if (r.overall <= 2)
    return {
      mood: "sad",
      text: pick([
        "合わなかったかあ。苦手がわかるのも大事な記録だよ",
        "残念だったね。次はきっと好きな1杯に会えるよ",
      ]),
    };

  if (isToday && sameDay === 3)
    return { mood: "normal", text: "3杯目だね。お水もいっしょに飲もうね" };

  const streak = streakDays(new Set(all.map((x) => x.date)), r.date);
  if (isToday && streak >= 3)
    return { mood: "normal", text: `${streak}日続けて記録してるね！休肝日もはさんでね` };

  const hour = now.getHours();
  if (isToday && (hour >= 23 || hour < 4))
    return { mood: "normal", text: "夜ふかしさんだね。あったかくして寝てね" };

  const lines = kindLines(r);
  return { mood: "happy", text: pick(lines.length > 0 && Math.random() < 0.7 ? lines : PLAIN) };
}
