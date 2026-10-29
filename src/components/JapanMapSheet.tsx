"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { JAPAN_PATHS, JAPAN_VIEWBOX, OKINAWA_SHIFT } from "@/lib/japanMap";
import { REGIONS, type Stamp } from "@/lib/origins";

// 地図の id（ローマ字）→ スタンプ帳の県名
const PREFS = REGIONS.filter((r) => r.region !== "海外").flatMap((r) =>
  r.places.map((p) => ({ id: p.aliases[0], name: p.name })),
);

/** 産地スタンプ帳の右下の地図ボタンから開く。飲んだ県だけ色が付いた日本地図 */
export default function JapanMapSheet({ stamps, onClose }: { stamps: Map<string, Stamp>; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = PREFS.filter((p) => stamps.has(p.name)).length;
  const stamp = picked ? stamps.get(picked) : undefined;
  const best = stamp && [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date))[0];

  const shape = (p: (typeof PREFS)[number]) => (
    <path
      key={p.id}
      d={JAPAN_PATHS[p.id]}
      className={stamps.has(p.name) ? "jmap-pref on" : "jmap-pref"}
      data-picked={picked === p.name || undefined}
      // 沖縄は囲んでいる枠のほうで押す
      onClick={p.id === "okinawa" ? undefined : () => setPicked((x) => (x === p.name ? null : p.name))}
    >
      <title>{p.name}</title>
    </path>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet jmap-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jmap-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="jmap-title">
            日本地図 <span className="jmap-count">{done} / 47</span>
          </h2>
          <button className="icon-btn" aria-label="閉じる" onClick={onClose} autoFocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <svg className="jmap" viewBox={JAPAN_VIEWBOX} role="img" aria-label={`飲んだ県 ${done}か所`}>
          {PREFS.filter((p) => p.id !== "okinawa").map(shape)}
          {/* 沖縄は左上の枠に。島が小さいので、枠ごと押せるようにする */}
          <g
            className={stamps.has("沖縄") ? "jmap-okinawa on" : "jmap-okinawa"}
            data-picked={picked === "沖縄" || undefined}
            onClick={() => setPicked((x) => (x === "沖縄" ? null : "沖縄"))}
          >
            <rect className="jmap-inset" x="2" y="2" width="132" height="102" rx="8" />
            <text x="12" y="24">沖縄</text>
            <g transform={OKINAWA_SHIFT}>{shape(PREFS.find((p) => p.id === "okinawa")!)}</g>
          </g>
        </svg>

        <div className="jmap-info" aria-live="polite">
          {!picked ? (
            <span className="muted">県を押すと、そこで飲んだお酒が見られます</span>
          ) : !stamp || !best ? (
            <span>
              <strong>{picked}</strong>
              <span className="muted">　まだ。次に試してみる？</span>
            </span>
          ) : (
            <Link href={`/record?id=${best.id}`} className="jmap-best">
              <span>
                <strong>{picked}</strong>
                <span className="muted">
                  　{stamp.count}杯・最高{stars(stamp.best)}
                </span>
              </span>
              <span className="jmap-best-name">いちばん：{drinkTitle(best)} ›</span>
            </Link>
          )}
        </div>

        <p className="jmap-credit">地図：MapSVG（CC BY 4.0）</p>
      </section>
    </div>
  );
}
