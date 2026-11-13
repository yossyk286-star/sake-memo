import Medal, { BADGE_FROM } from "./Medal";
import type { Badge } from "@/lib/appeal";

/** しるし1つ分のメダル。段ごとに 銅→銀→金→プラチナ→ダイヤ と変わる。「#10」のような icon は数字を彫る */
export default function BadgeMedal({ badge, size = 56, shine = false }: { badge: Badge; size?: number; shine?: boolean }) {
  const num = badge.icon.startsWith("#") ? badge.icon.slice(1) : undefined;
  return <Medal metal={BADGE_FROM + Math.max(0, badge.tier)} icon={num ? undefined : badge.icon} text={num} size={size} locked={!badge.done} shine={shine} />;
}
