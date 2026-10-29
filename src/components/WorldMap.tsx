"use client";

import { useState } from "react";
import { WORLD_AREAS, WORLD_PATHS, WORLD_PLACES, WORLD_VIEWBOX } from "@/lib/worldMap";

// 寄ったときの地図の縦横比。縦長の地域でも地図の高さが変わりすぎないように、この比に広げて見せる
const AREA_RATIO = 1.6;

function fitArea(box: string) {
  const [x, y, w, h] = box.split(" ").map(Number);
  const W = Math.max(w, h * AREA_RATIO);
  const H = W / AREA_RATIO;
  return `${Math.round(x - (W - w) / 2)} ${Math.round(y - (H - h) / 2)} ${Math.round(W)} ${Math.round(H)}`;
}

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
  const viewBox = area ? fitArea(WORLD_AREAS[area]) : WORLD_VIEWBOX;
  // 寄ったぶん点が大きくならないように、見ている幅に合わせて半径を決める
  const zoom = Number(viewBox.split(" ")[2]) / Number(WORLD_VIEWBOX.split(" ")[2]);

  const dots = places.filter((n) => WORLD_PLACES[n]);
  const onIso = new Map<string, string>();
  for (const n of dots) {
    const iso = WORLD_PLACES[n].iso;
    // イギリスとスコットランドのように同じ国の形なら、どちらかを飲んでいれば塗る
    if (iso && (!onIso.has(iso) || visited(n))) onIso.set(iso, n);
  }

  return (
    <>
      <svg className="wmap" viewBox={viewBox} role="img" aria-label="飲んだ国の世界地図">
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
              <title>{n}</title>
            </circle>
          );
        })}
      </svg>
      <div className="row wmap-areas" role="group" aria-label="地域に寄る">
        {[null, ...areas].map((a) => (
          <button key={a ?? "all"} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
            {a ?? "ぜんぶ"}
          </button>
        ))}
      </div>
    </>
  );
}
