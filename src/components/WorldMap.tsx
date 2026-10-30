"use client";

import { useState } from "react";
import { fitBox, useViewBox } from "@/lib/useViewBox";
import { WORLD_AREAS, WORLD_PATHS, WORLD_PLACES, WORLD_VIEWBOX } from "@/lib/worldMap";
import { tr, trv } from "@/lib/i18n";

const [, , FULL_W, FULL_H] = WORLD_VIEWBOX.split(" ").map(Number);

/**
 * 飲んだ国だけ色が付く世界地図。小さい国も押せるように、スタンプ帳の産地には点を打つ。
 * 下のボタンで地域に寄れる
 */
export default function WorldMap({
  places,
  visited,
  areas,
  picked,
  onPick,
}: {
  /** スタンプ帳に並ぶ産地の名前 */
  places: string[];
  visited: (name: string) => boolean;
  /** 寄って見られる地域（WORLD_AREAS の名前） */
  areas: string[];
  picked: string | null;
  onPick: (name: string) => void;
}) {
  const [area, setArea] = useState<string | null>(null);
  // 寄っても全体と同じ縦横比のまま見せる（地図の枠の形が変わると国が伸びて見えるので）
  const viewBox = useViewBox(area ? fitBox(WORLD_AREAS[area], FULL_W / FULL_H, 0, 0.05) : WORLD_VIEWBOX);
  // 寄ったぶん点が大きくならないように、見ている幅に合わせて半径を決める
  const zoom = Number(viewBox.split(" ")[2]) / FULL_W;

  const dots = places.filter((n) => WORLD_PLACES[n]);
  const onIso = new Map<string, string>();
  for (const n of dots) {
    const iso = WORLD_PLACES[n].iso;
    // イギリスとスコットランドのように同じ国の形なら、どちらかを飲んでいれば塗る
    if (iso && (!onIso.has(iso) || visited(n))) onIso.set(iso, n);
  }

  return (
    <>
      <svg className="wmap" viewBox={viewBox} role="img" aria-label={tr("飲んだ国の世界地図")}>
        {Object.entries(WORLD_PATHS).map(([iso, d]) => {
          const name = onIso.get(iso);
          return (
            <path
              key={iso}
              d={d}
              className={name && visited(name) ? "wmap-land on" : name ? "wmap-land listed" : "wmap-land"}
              data-picked={(name && picked === name) || undefined}
              onClick={name ? () => onPick(name) : undefined}
            />
          );
        })}
        {dots.map((n) => {
          const p = WORLD_PLACES[n];
          return (
            <circle
              key={n}
              cx={p.x}
              cy={p.y}
              r={(picked === n ? 7 : 5) * zoom}
              strokeWidth={1.5 * zoom}
              className={visited(n) ? "wmap-dot on" : "wmap-dot"}
              onClick={() => onPick(n)}
            >
              <title>{trv(n)}</title>
            </circle>
          );
        })}
      </svg>
      <div className="row wmap-areas" role="group" aria-label={tr("地域に寄る")}>
        {[null, ...areas].map((a) => (
          <button key={a ?? "all"} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
            {a ?? tr("ぜんぶ")}
          </button>
        ))}
      </div>
    </>
  );
}
