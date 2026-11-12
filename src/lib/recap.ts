import { APP, placesOf, WORDS } from "./appeal";
import { TASTE_AXES } from "./axes";
import { groupByShop } from "./shops";
import type { TastingRecord } from "./types";

export type Recap = {
  /** ふりかえる月（YYYY-MM） */
  month: string;
  monthNumber: number;
  count: number;
  /** その月にはじめて飲んだ産地 */
  newPlaces: string[];
  best: TastingRecord;
  /** 2回以上行ったお店のうち、いちばん多かったところ */
  shop: { name: string; times: number } | null;
  /** 平均がいちばん高かった味（3.5 以上のとき） */
  axis: string | null;
};

/** 先月の記録のまとめ。先月に記録がなければ null */
export function lastMonthRecap(records: TastingRecord[], now = new Date()): Recap | null {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const rs = records.filter((r) => r.date.startsWith(month));
  if (rs.length === 0) return null;
  const newPlaces = [...placesOf(records)]
    .filter(([, s]) => s.records.reduce((min, r) => (r.date < min ? r.date : min), "9999").startsWith(month))
    .map(([name]) => name);
  const best = [...rs].sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
  const shop = groupByShop(rs)
    .filter((s) => s.records.length >= 2)
    .sort((a, b) => b.records.length - a.records.length)[0];
  const axes = TASTE_AXES.map(([label, get]) => {
    const vs = rs.map(get).filter((v): v is number => typeof v === "number");
    return { label, avg: vs.length >= 2 ? vs.reduce((a, b) => a + b, 0) / vs.length : 0 };
  }).sort((a, b) => b.avg - a.avg);
  return {
    month,
    monthNumber: d.getMonth() + 1,
    count: rs.length,
    newPlaces,
    best,
    shop: shop ? { name: shop.name, times: shop.records.length } : null,
    axis: axes[0] && axes[0].avg >= 3.5 ? axes[0].label : null,
  };
}

const SEEN_KEY = `${APP.id}:recap-seen`;

export function recapSeen(month: string) {
  try {
    return localStorage.getItem(SEEN_KEY) === month;
  } catch {
    return true;
  }
}

export function markRecapSeen(month: string) {
  try {
    localStorage.setItem(SEEN_KEY, month);
  } catch {}
}

export type YearCard = { eyebrow: string; title: string; stats: { label: string; value: string }[]; lines: string[]; recordId?: string };

/** 1年分のまとめ（5）。12月と、年が明けて1月のうちは前の年を出す。記録が5件未満なら null */
export function recapYear(now = new Date()) {
  return now.getMonth() === 11 ? now.getFullYear() : now.getMonth() === 0 ? now.getFullYear() - 1 : null;
}

/** その年の記録を、順にめくるカード5〜6枚にする。titleOf は一覧と同じ名前の出し方 */
export function yearCards(records: TastingRecord[], year: number, titleOf: (r: TastingRecord) => string, t: (ja: string, ...a: (string | number)[]) => string): YearCard[] | null {
  const rs = records.filter((r) => r.date.startsWith(`${year}-`));
  if (rs.length < 5) return null;
  const eyebrow = t("{0}年のまとめ", year);
  const days = new Set(rs.map((r) => r.date)).size;
  const names = new Set(rs.map((r) => r.name.trim()).filter(Boolean)).size;
  const cards: YearCard[] = [
    {
      eyebrow,
      title: t("{0}年に記録した{1}", year, WORDS.drink),
      stats: [
        { label: t("記録した"), value: t("{0}{1}", rs.length, WORDS.cup) },
        { label: t("飲んだ日"), value: t("{0}日", days) },
      ],
      lines: [t("ちがう名前の{0}は{1}種類", WORDS.drink, names)],
    },
  ];
  const best = [...rs].sort((a, b) => b.overall - a.overall || b.createdAt - a.createdAt)[0];
  cards.push({
    eyebrow,
    title: t("いちばんの1杯"),
    stats: [{ label: titleOf(best), value: `★${best.overall.toFixed(1)}` }],
    lines: [[best.shop, best.date.replaceAll("-", "/")].filter(Boolean).join("・"), best.memo.slice(0, 40)].filter(Boolean),
    recordId: best.id,
  });
  const shops = groupByShop(rs).sort((a, b) => b.records.length - a.records.length).slice(0, 3);
  if (shops.length)
    cards.push({
      eyebrow,
      title: t("よく行ったお店"),
      stats: [{ label: shops[0].name, value: t("{0}回", shops[0].records.length) }],
      lines: shops.slice(1).map((s, i) => t("{0}位 {1}（{2}回）", i + 2, s.name, s.records.length)),
    });
  const newPlaces = [...placesOf(records)]
    .filter(([, s]) => s.records.reduce((min, r) => (r.date < min ? r.date : min), "9999").startsWith(`${year}-`))
    .map(([name]) => name);
  if (newPlaces.length)
    cards.push({
      eyebrow,
      title: t("新しく出会った{0}", WORDS.place),
      stats: [{ label: t("はじめての{0}", WORDS.place), value: t("+{0}{1}", newPlaces.length, WORDS.placeUnit) }],
      lines: [newPlaces.slice(0, 8).join("・")],
    });
  // 好み：いちばん多かった種類と、よく選んだ味の言葉
  const kinds = new Map<string, number>();
  const words = new Map<string, number>();
  for (const r of rs) {
    const k = [r.kind, r.style].filter(Boolean).join(" ");
    if (k) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    for (const f of r.flavors) words.set(f, (words.get(f) ?? 0) + 1);
  }
  const topKind = [...kinds].sort((a, b) => b[1] - a[1])[0];
  const topWords = [...words].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  if (topKind)
    cards.push({
      eyebrow,
      title: t("今年の好み"),
      stats: [{ label: t("いちばん多かった"), value: topKind[0] }],
      lines: topWords.length ? [t("よく感じた味：{0}", topWords.join("・"))] : [],
    });
  const avg = rs.reduce((s, r) => s + r.overall, 0) / rs.length;
  const priced = rs.filter((r) => r.price);
  const yen = priced.reduce((s, r) => s + (r.price ?? 0), 0);
  cards.push({
    eyebrow,
    title: t("{0}年、おつかれさまでした", year),
    stats: [
      { label: t("平均"), value: `★${avg.toFixed(1)}` },
      ...(priced.length ? [{ label: t("使ったお金"), value: t("{0}円", yen.toLocaleString("ja-JP")) }] : []),
    ],
    lines: [t("来年もいい1杯に出会えますように")],
  });
  return cards;
}
