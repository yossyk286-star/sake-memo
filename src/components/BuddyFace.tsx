import type { BuddyMood } from "@/lib/buddy";

/** 相棒のちっちゃい徳利。顔だけ気分で変わる。色はテーマのトークンから取る */
export default function BuddyFace({ mood = "normal", size = 56 }: { mood?: BuddyMood; size?: number }) {
  const body =
    "M28 11C28 16 27 19 24 22C14 28 10 38 12 47C14 55 22 59 32 59C42 59 50 55 52 47C54 38 50 28 40 22C37 19 36 16 36 11Z";
  return (
    <svg className="buddy-face" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="60.5" rx="15" ry="2.2" fill="var(--fill-strong)" />
      <path d={body} fill="var(--buddy-body)" />
      {/* 首の藍の帯と、胴のすそのライン */}
      <g fill="var(--accent)">
        <path d="M25.4 19.6h13.2l1.4 1.6-1.6 1.4H24.6l-1.6-1.4z" />
        <path d="M13.4 51C16 56.5 23 59 32 59s16-2.5 18.6-8z" opacity="0.85" />
      </g>
      <path d={body} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="24.5" y="6.5" width="15" height="5" rx="2.5" fill="var(--buddy-body)" stroke="var(--accent)" strokeWidth="2" />

      <g fill="var(--buddy-blush)">
        <ellipse cx="20.5" cy="45.5" rx="3.2" ry="2" />
        <ellipse cx="43.5" cy="45.5" rx="3.2" ry="2" />
      </g>
      <g stroke="var(--buddy-ink)" strokeWidth="2" strokeLinecap="round" fill="none">
        {mood === "happy" && (
          <>
            <path d="M22.5 41.5q2.5-3.2 5 0M36.5 41.5q2.5-3.2 5 0" />
            <path d="M28.5 45.5q3.5 4.5 7 0z" fill="var(--buddy-ink)" strokeLinejoin="round" />
          </>
        )}
        {mood === "normal" && <path d="M29 45.5q3 2.6 6 0" />}
        {mood === "wow" && <ellipse cx="32" cy="47" rx="2.2" ry="2.6" fill="var(--buddy-ink)" stroke="none" />}
        {mood === "worried" && (
          <>
            <path d="M21.5 36.5l5-1.6M42.5 36.5l-5-1.6" strokeWidth="1.6" />
            <path d="M28 47.5q2-1.8 4 0t4 0" strokeWidth="1.8" />
          </>
        )}
        {mood === "sad" && (
          <>
            <path d="M22 37.2l4.6-1.2M42 37.2l-4.6-1.2" strokeWidth="1.6" />
            <path d="M29 47.5q3-2.6 6 0" />
          </>
        )}
      </g>
      {mood !== "happy" && (
        <g fill="var(--buddy-ink)">
          <circle cx="25" cy={mood === "sad" ? 41.5 : 40.5} r={mood === "wow" ? 2.6 : 2.2} />
          <circle cx="39" cy={mood === "sad" ? 41.5 : 40.5} r={mood === "wow" ? 2.6 : 2.2} />
          {mood === "wow" && (
            <g fill="var(--buddy-body)">
              <circle cx="25.9" cy="39.6" r="0.9" />
              <circle cx="39.9" cy="39.6" r="0.9" />
            </g>
          )}
        </g>
      )}
      {mood === "worried" && (
        <path className="buddy-sweat" d="M49 26c-1.8 2.6-2.6 4-2.6 5.2a2.6 2.6 0 0 0 5.2 0c0-1.2-.8-2.6-2.6-5.2z" fill="var(--buddy-drop)" />
      )}
      {mood === "sad" && <path d="M41 44.5c-1 1.6-1.5 2.4-1.5 3.1a1.5 1.5 0 0 0 3 0c0-.7-.5-1.5-1.5-3.1z" fill="var(--buddy-drop)" />}
      {mood === "wow" && (
        <g className="buddy-spark" fill="var(--buddy-spark)">
          <path d="M9 18l1.3 3.2 3.2 1.3-3.2 1.3L9 27l-1.3-3.2-3.2-1.3 3.2-1.3z" />
          <path d="M55 12l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
        </g>
      )}
    </svg>
  );
}
