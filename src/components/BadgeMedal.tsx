import Medal from "./Medal";
import type { Badge } from "@/lib/appeal";

/** しるし1つ分のメダル。取ったら金、続けてプラチナの目安に届いたらプラチナ。「#10」のような icon は数字を彫る */
export default function BadgeMedal({ badge, size = 56, shine = false }: { badge: Badge; size?: number; shine?: boolean }) {
  const num = badge.icon.startsWith("#") ? badge.icon.slice(1) : undefined;
  return <Medal metal={badge.done && badge.plat?.done ? 3 : 2} icon={num ? undefined : badge.icon} text={num} size={size} locked={!badge.done} shine={shine} />;
}
