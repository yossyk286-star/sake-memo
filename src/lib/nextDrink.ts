import { SERVES_BY_KIND, STYLES_BY_KIND, TERMS } from "./glossary";
import type { MyPrefs } from "./prefs";
import type { Kind, TastingRecord } from "./types";

export type NextIdea = { title: string; reason: string; description?: string };

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function describe(kind: Kind, style: string) {
  return TERMS.find((t) => t.category === kind && t.term === style)?.description;
}

/**
 * 次に試すと勉強になるお酒。
 * 好きな種類のまだ飲んでいないタイプ、評価の高いタイプのまだ試していない飲み方、まだ飲んでいない種類の順に出す
 */
export function nextIdeas(records: TastingRecord[], prefs: MyPrefs, limit = 4): NextIdea[] {
  const ideas: NextIdea[] = [];

  // 種類ごとの評価。自分で登録した好きな種類は少し上げる
  const kinds = new Map<Kind, number[]>();
  for (const r of records) if (r.kind) kinds.set(r.kind, [...(kinds.get(r.kind) ?? []), r.overall]);
  const ranked = [...kinds]
    .map(([kind, scores]) => ({ kind, score: average(scores) + (prefs.kinds.includes(kind) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((k) => k.kind);
  for (const k of prefs.kinds as Kind[]) if (!ranked.includes(k)) ranked.push(k);

  // 1. 好きな種類の、まだ飲んでいないタイプ（その種類で好きなタイプに近い順は判断できないので、並び順のまま）
  for (const kind of ranked.slice(0, 2)) {
    const tried = new Set(records.filter((r) => r.kind === kind).map((r) => r.style));
    const untried = STYLES_BY_KIND[kind].filter((s) => !tried.has(s));
    for (const style of untried.slice(0, 2)) {
      ideas.push({
        title: `${kind}の${style}`,
        reason: kinds.has(kind) ? `${kind}の評価が高めで、${style}はまだ記録がありません` : `好きな${kind}で、まだ記録がありません`,
        description: describe(kind, style),
      });
    }
  }

  // 2. いちばん評価の高いタイプを、まだ試していない飲み方で
  const styles = new Map<string, { kind: Kind; style: string; scores: number[] }>();
  for (const r of records) {
    if (!r.kind || !r.style) continue;
    const key = `${r.kind}・${r.style}`;
    const s = styles.get(key) ?? { kind: r.kind, style: r.style, scores: [] };
    styles.set(key, { ...s, scores: [...s.scores, r.overall] });
  }
  const topStyle = [...styles.values()].sort((a, b) => average(b.scores) - average(a.scores))[0];
  if (topStyle && average(topStyle.scores) >= 3.5) {
    const tried = new Set(
      records.filter((r) => r.kind === topStyle.kind && r.style === topStyle.style).map((r) => r.serve),
    );
    const serve = SERVES_BY_KIND[topStyle.kind].find((s) => !tried.has(s));
    if (serve && topStyle.kind !== "ビール") {
      ideas.unshift({
        title: `${topStyle.style}を${serve}で`,
        reason: `${topStyle.kind}・${topStyle.style}が★${average(topStyle.scores).toFixed(1)}と好評。飲み方を変えると味の違いがわかります`,
        description: TERMS.find((t) => t.category === "飲み方" && t.term === serve)?.description,
      });
    }
  }

  // 3. まだ飲んでいない種類（「その他」は広すぎるので出さない）
  const untriedKinds = (Object.keys(STYLES_BY_KIND) as Kind[]).filter((k) => k !== "その他" && !kinds.has(k) && !prefs.avoidKinds.includes(k));
  if (untriedKinds.length > 0 && records.length > 0) {
    const kind = untriedKinds[0];
    const style = STYLES_BY_KIND[kind][0];
    ideas.push({
      title: `${kind}（まずは${style}など）`,
      reason: `${kind}はまだ記録がありません`,
      description: describe(kind, style),
    });
  }

  return ideas.slice(0, limit);
}
