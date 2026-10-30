"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { drinkTitle, stars } from "@/components/RecordCard";
import { JAPAN_BOXES, JAPAN_PATHS, JAPAN_VIEWBOX, OKINAWA_SHIFT } from "@/lib/japanMap";
import { REGIONS, type Stamp } from "@/lib/origins";
import { fitBox, useViewBox } from "@/lib/useViewBox";
import { tr, trv } from "@/lib/i18n";

// 世界地図の形は大きいので、「世界」を押したときに読み込む
const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

// 地図の id（ローマ字）→ スタンプ帳の県名
const PREFS = REGIONS.filter((r) => r.region !== "海外").flatMap((r) =>
  r.places.map((p) => ({ id: p.aliases[0], name: p.name })),
);
const [, , JAPAN_W, JAPAN_H] = JAPAN_VIEWBOX.split(" ").map(Number);
const ABROAD = REGIONS.find((r) => r.region === "海外")!.places.map((p) => p.name);

type Mode = "日本" | "世界";
const MODE_KEY = "sake-memo:map-mode";

/** 産地スタンプ帳の右下の地図ボタンから開く。飲んだ県・国だけ色が付いた地図（日本と世界を切り替え） */
export default function JapanMapSheet({ stamps, onClose }: { stamps: Map<string, Stamp>; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("日本");
  useEffect(() => {
    try {
      if (localStorage.getItem(MODE_KEY) === "世界") setMode("世界");
    } catch {}
  }, []);
  const pickMode = (m: Mode) => {
    setMode(m);
    setPicked(null);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = PREFS.filter((p) => stamps.has(p.name)).length;
  const abroad = ABROAD.filter((n) => stamps.has(n)).length;
  // 世界地図の日本は、どこかの県を飲んでいれば塗る。押すと日本地図に切り替える
  const visited = (name: string) => (name === "日本" ? done > 0 : stamps.has(name));
  const pickWorld = (name: string) => (name === "日本" ? pickMode("日本") : setPicked((x) => (x === name ? null : name)));
  const stamp = picked ? stamps.get(picked) : undefined;
  const best = stamp && [...stamp.records].sort((a, b) => b.overall - a.overall || b.date.localeCompare(a.date))[0];

  // 県を押したらその県に寄る。小さい県でもまわりが少し見える広さにする
  const pickedPref = mode === "日本" ? PREFS.find((p) => p.name === picked) : undefined;
  const viewBox = useViewBox(
    pickedPref ? fitBox(JAPAN_BOXES[pickedPref.id], JAPAN_W / JAPAN_H, JAPAN_W / 3.2) : JAPAN_VIEWBOX,
  );

  const shape = (p: (typeof PREFS)[number]) => (
    <path
      key={p.id}
      d={JAPAN_PATHS[p.id]}
      className={stamps.has(p.name) ? "jmap-pref on" : "jmap-pref"}
      data-picked={picked === p.name || undefined}
      // 沖縄は囲んでいる枠のほうで押す
      onClick={p.id === "okinawa" ? undefined : () => setPicked((x) => (x === p.name ? null : p.name))}
    >
      <title>{trv(p.name)}</title>
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
            {tr("{0}地図", mode)}{" "}
            <span className="jmap-count">{mode === "日本" ? `${done} / 47` : `${abroad} / ${ABROAD.length}`}</span>
          </h2>
          <button className="icon-btn" aria-label={tr("閉じる")} onClick={onClose} autoFocus>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mode-switch" role="group" aria-label={tr("地図")}>
          {(["日本", "世界"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => pickMode(m)}>
              {trv(m)}
            </button>
          ))}
        </div>

        {mode === "世界" ? (
          <WorldMap
            places={["日本", ...ABROAD]}
            visited={visited}
            areas={["ヨーロッパ", "北米", "南米", "アジア", "オセアニア"]}
            picked={picked}
            onPick={pickWorld}
          />
        ) : (
          <div className="jmap-wrap">
            <svg className="jmap" viewBox={viewBox} role="img" aria-label={tr("飲んだ県 {0}か所", done)}>
              {PREFS.filter((p) => p.id !== "okinawa").map(shape)}
              {/* 沖縄は左上の枠に。島が小さいので、枠ごと押せるようにする */}
              <g
                className={stamps.has("沖縄") ? "jmap-okinawa on" : "jmap-okinawa"}
                data-picked={picked === "沖縄" || undefined}
                onClick={() => setPicked((x) => (x === "沖縄" ? null : "沖縄"))}
              >
                <rect className="jmap-inset" x="2" y="2" width="132" height="102" rx="8" />
                <text x="12" y="24">{tr("沖縄")}</text>
                <g transform={OKINAWA_SHIFT}>{shape(PREFS.find((p) => p.id === "okinawa")!)}</g>
              </g>
            </svg>
            {pickedPref && (
              <button type="button" className="jmap-all" onClick={() => setPicked(null)}>
                {tr("全体を見る")}
              </button>
            )}
          </div>
        )}

        <div className="jmap-info" aria-live="polite">
          {!picked ? (
            <span className="muted">{mode === "日本" ? tr("県") : tr("国や点")}{tr("を押すと、そこで飲んだお酒が見られます")}</span>
          ) : !stamp || !best ? (
            <span>
              <strong>{trv(picked)}</strong>
              <span className="muted">{"　"}{tr("まだ。次に試してみる？")}</span>
            </span>
          ) : (
            <Link href={`/record?id=${best.id}`} className="jmap-best">
              <span>
                <strong>{trv(picked)}</strong>
                <span className="muted">
                  　{"　"}{tr("{0}杯・最高{1}", stamp.count, stars(stamp.best))}
                </span>
              </span>
              <span className="jmap-best-name">{tr("いちばん：{0} ›", drinkTitle(best))}</span>
            </Link>
          )}
        </div>

        <p className="jmap-credit">{mode === "日本" ? tr("地図：MapSVG（CC BY 4.0）") : tr("地図：Natural Earth")}</p>
      </section>
    </div>
  );
}
