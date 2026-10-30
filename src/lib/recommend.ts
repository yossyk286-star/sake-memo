import type { ScannedDrink } from "./menuScan";
import { placeOf } from "./origins";
import { hasPrefs, type MyPrefs } from "./prefs";
import type { TastingRecord } from "./types";
import { tr } from "./i18n";

/** 味の表現ごとに、メニューの説明で使われがちな言葉 */
const FLAVOR_WORDS: Record<string, string[]> = {
  フルーティー: ["フルーティ", "果実", "りんご", "リンゴ", "林檎", "メロン", "バナナ", "洋梨", "マスカット", "ライチ", "fruity"],
  華やか: ["華やか", "華", "花", "フローラル", "吟醸香", "floral"],
  米の旨み: ["旨み", "旨味", "うまみ", "米の", "ふくよか", "コク"],
  柑橘: ["柑橘", "レモン", "グレープフルーツ", "オレンジ", "ゆず", "柚子", "シトラス", "citrus"],
  ベリー: ["ベリー", "カシス", "いちご", "苺", "チェリー", "さくらんぼ", "berry"],
  辛口: ["辛口", "ドライ", "キレ", "dry"],
  ナッツ: ["ナッツ", "アーモンド", "くるみ", "ヘーゼル", "nut"],
  "バニラ・樽": ["バニラ", "樽", "オーク", "vanilla", "oak"],
  スモーキー: ["スモーキー", "ピート", "燻", "煙", "smoky", "peat"],
  ホップ: ["ホップ", "hop"],
  スパイシー: ["スパイシー", "スパイス", "胡椒", "こしょう", "シナモン", "spicy"],
  ミネラル: ["ミネラル", "mineral"],
};

/** おすすめを出すのに必要な記録の数 */
export const MIN_RECORDS = 2;

export type DrinkPick = { score: number; reasons: string[] };

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** メニューの説明に出てくる味の表現。自分で追加した味もそのまま探す */
function flavorsIn(text: string, custom: string[]) {
  const t = text.toLowerCase();
  const found = Object.entries(FLAVOR_WORDS)
    .filter(([, words]) => words.some((w) => t.includes(w.toLowerCase())))
    .map(([tag]) => tag);
  return [...new Set([...found, ...custom.filter((f) => t.includes(f.toLowerCase()))])];
}

/**
 * これまでの記録の総合評価と、自分で登録した好みから、メニューのお酒それぞれの「好みに合いそう度」を出す。
 * 平均より高く評価した種類・タイプ・味や、登録した好みに近いほど高い。
 * 記録が少なく好みの登録もないときは null
 */
export function scoreDrinks(drinks: ScannedDrink[], records: TastingRecord[], prefs: MyPrefs): DrinkPick[] | null {
  const useRecords = records.length >= MIN_RECORDS;
  if (!useRecords && !hasPrefs(prefs)) return null;
  const base = useRecords ? average(records.map((r) => r.overall)) : 0;
  const custom = [...new Set([...records.flatMap((r) => r.flavors), ...prefs.likes, ...prefs.dislikes])].filter(
    (f) => !(f in FLAVOR_WORDS),
  );

  // 種類やタイプが同じ記録の平均と、全体の平均の差。件数が少ないうちは控えめに効かせる
  function lean(match: (r: TastingRecord) => boolean) {
    const scores = records.filter(match).map((r) => r.overall);
    if (scores.length === 0) return null;
    const avg = average(scores);
    return { avg, weight: ((avg - base) * Math.min(scores.length, 3)) / 3 };
  }

  return drinks.map((d) => {
    let score = 0;
    const reasons: string[] = [];
    const flavors = flavorsIn(`${d.menuNote} ${d.name}`, custom);

    // 自分で登録した好み
    if (d.kind && prefs.kinds.includes(d.kind)) {
      score += 0.4;
      reasons.push(tr("好きな{0}", d.kind));
    }
    if (d.style && prefs.styles.includes(d.style)) {
      score += 0.6;
      reasons.push(tr("好きな{0}", d.style));
    }
    if (d.kind && prefs.avoidKinds.includes(d.kind)) score -= 0.8;
    if (d.recommendedServe && prefs.serves.includes(d.recommendedServe)) {
      score += 0.3;
      reasons.push(tr("好きな飲み方（{0}）", d.recommendedServe));
    }
    const place = placeOf(d) ?? d.origin;
    if (place && prefs.origins.some((o) => o === place || d.origin.includes(o))) {
      score += 0.4;
      reasons.push(tr("好きな産地（{0}）", place));
    }
    // 甘さ・コク・香りの好みに、味の予想が近いほど上げ、離れているほど下げる
    const near = (["sweetness", "body", "aroma"] as const).filter((k) => {
      const want = prefs[k];
      if (want === null) return false;
      const gap = Math.abs(d.taste[k] - want);
      score += gap <= 1 ? 0.3 : gap >= 3 ? -0.3 : 0;
      return gap <= 1;
    });
    if (near.length >= 2) reasons.push("好みの味の寄り方に近い");
    const prefLiked = flavors.filter((f) => prefs.likes.includes(f));
    const prefDisliked = flavors.filter((f) => prefs.dislikes.includes(f));
    score += 0.5 * prefLiked.length - 0.6 * prefDisliked.length;
    if (prefLiked.length > 0) reasons.push(tr("好きな味（{0}）", prefLiked.join("・")));

    if (!useRecords) return { score, reasons };

    // 同じお酒を前に飲んでいれば、その評価がいちばん確か
    const same = records.filter((r) => r.name && r.name === d.name);
    if (same.length > 0) {
      const avg = average(same.map((r) => r.overall));
      score += (avg - base) * 1.5;
      reasons.push(tr("前に飲んで★{0}", avg.toFixed(1)));
    }

    const kind = d.kind ? lean((r) => r.kind === d.kind) : null;
    if (kind) {
      score += kind.weight * 0.5;
      if (kind.avg >= 4 && kind.weight > 0) reasons.push(tr("{0}の評価が高め（平均★{1}）", d.kind, kind.avg.toFixed(1)));
    }
    const style = d.kind && d.style ? lean((r) => r.kind === d.kind && r.style === d.style) : null;
    if (style) {
      score += style.weight;
      if (style.avg >= 4 && style.weight > 0) reasons.push(tr("{0}の評価が高め（平均★{1}）", d.style, style.avg.toFixed(1)));
    }

    // 高く評価した記録で感じた味が、メニューの説明にどれだけあるか（登録した好みと重なる分は数えない）
    const liked = flavors.filter(
      (f) => !prefLiked.includes(f) && records.some((r) => r.overall >= 4 && r.flavors.includes(f)),
    );
    const disliked = flavors.filter((f) => records.some((r) => r.overall <= 2 && r.flavors.includes(f)));
    score += 0.4 * liked.length - 0.4 * disliked.length;
    if (liked.length > 0) reasons.push(tr("高評価のときの味（{0}）が入っている", liked.join("・")));

    return { score, reasons };
  });
}

/** おすすめするお酒の番号。好みに合う理由があり、いちばん点が高いもの。なければ -1 */
export function bestPick(picks: DrinkPick[]) {
  let best = -1;
  picks.forEach((p, i) => {
    if (p.score > 0 && p.reasons.length > 0 && (best < 0 || p.score > picks[best].score)) best = i;
  });
  return best;
}
