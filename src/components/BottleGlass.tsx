"use client";

import { useId } from "react";

/** 瓶の絵に、残りの分だけ液が入っている（49）。ratio は 0〜1。sloshing が true のあいだ瓶がゆらっと揺れて液面が動く */
export default function BottleGlass({ ratio, color, sloshing }: { ratio: number; color: string; sloshing?: boolean }) {
  const id = useId();
  // 液が入る胴の部分（肩の y=12 からそこの y=42）に合わせる
  const y = 42 - Math.max(0, Math.min(1, ratio)) * 30;
  const body = "M9.5 2h5v8c0 3 5 4 5 9v21a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3V19c0-5 5-6 5-9z";
  return (
    <svg className={`bottle-glass${sloshing ? " is-sloshing" : ""}`} viewBox="0 0 24 46" width="22" height="42" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={body} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect className="bottle-glass-liquid" x="0" y={y} width="24" height="46" fill={color} />
      </g>
      <path d={body} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}
