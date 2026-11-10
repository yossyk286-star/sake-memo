import { useId } from "react";

/** 称号の段ごとのメダルの色（銅・銀・金・白金・紅）。地金の明るい色・暗い色と、リボンの2色 */
const TIERS = [
  { hi: "#f3c39a", lo: "#a8643a", edge: "#7d4524", ribbon: ["#3d7a5a", "#2c5c43"] },
  { hi: "#f4f6f8", lo: "#9aa3ad", edge: "#6d7681", ribbon: ["#3a63c8", "#2a4a99"] },
  { hi: "#fff1a8", lo: "#d49a12", edge: "#9a6a00", ribbon: ["#c0392b", "#8e2a1f"] },
  { hi: "#ffffff", lo: "#a9c4dd", edge: "#6f8fb0", ribbon: ["#5b3f9e", "#402a75"] },
  { hi: "#ffd0d6", lo: "#c2324d", edge: "#7d1a2e", ribbon: ["#1f1f24", "#000000"] },
];

/** 称号の札（プレート）を、その段のメダルと同じ地金の色にする */
export function plateStyle(tier: number): React.CSSProperties {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];
  return { background: `linear-gradient(180deg, ${t.lo}, ${t.edge})` };
}

/**
 * 称号のメダル。tier は 0 から（TITLES の順）。locked はまだ取っていない段（灰色で鍵）。
 * リボン・ぎざぎざの縁・地金のグラデーション・真ん中の星と段の数を SVG で描く
 */
export default function Medal({ tier, size = 64, locked = false, shine = false }: { tier: number; size?: number; locked?: boolean; shine?: boolean }) {
  const id = useId().replace(/:/g, "");
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];
  const c = locked ? { hi: "#e4e4ea", lo: "#b9b9c2", edge: "#9a9aa3", ribbon: ["#c9c9d1", "#b0b0b9"] } : t;
  // ぎざぎざの縁（24 山）
  const teeth = Array.from({ length: 48 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 48 - Math.PI / 2;
    const r = i % 2 ? 27.5 : 30;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(66 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const r = i % 2 ? 6 : 13;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(62 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg className={`medal${shine ? " medal-shine" : ""}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.55" stopColor={c.lo} />
          <stop offset="1" stopColor={c.hi} />
        </linearGradient>
        <linearGradient id={`f${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={c.lo} />
          <stop offset="1" stopColor={c.hi} />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <circle cx="50" cy="66" r="22" />
        </clipPath>
      </defs>
      {/* リボン（2本を V の字に） */}
      <path d="M30 2 H46 L58 38 H42 Z" fill={c.ribbon[1]} />
      <path d="M54 2 H70 L58 38 H42 Z" fill={c.ribbon[0]} />
      <path d="M38 2 H46 L52 20 L48 30 Z" fill="#fff" opacity={locked ? 0.25 : 0.35} />
      {/* メダル本体 */}
      <polygon points={teeth} fill={c.edge} />
      <circle cx="50" cy="66" r="26" fill={`url(#g${id})`} />
      <circle cx="50" cy="66" r="21" fill={`url(#f${id})`} stroke={c.edge} strokeOpacity="0.45" strokeWidth="1.2" />
      {locked ? (
        <g fill="none" stroke={c.edge} strokeWidth="3" strokeLinecap="round">
          <rect x="41" y="64" width="18" height="13" rx="3" fill={c.edge} stroke="none" />
          <path d="M44 64 v-4 a6 6 0 0 1 12 0 v4" />
        </g>
      ) : (
        <>
          <polygon points={star} fill="#fff" opacity="0.9" />
          <polygon points={star} fill={c.edge} opacity="0.35" transform="translate(0.8 0.8)" />
          <text x="50" y="83.5" textAnchor="middle" fontSize="9" fontWeight="800" fill={c.edge}>
            {"I II III IV V".split(" ")[tier] ?? ""}
          </text>
        </>
      )}
      {/* 光の筋（お祝いのときだけ動く） */}
      <g clipPath={`url(#c${id})`}>
        <rect className="medal-glint" x="10" y="30" width="10" height="80" fill="#fff" opacity={locked ? 0 : 0.35} transform="rotate(25 50 66)" />
      </g>
    </svg>
  );
}
