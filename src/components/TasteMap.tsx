"use client";

import { useState } from "react";
import RecordCard from "./RecordCard";
import { GENRES, genreColor, genreOf, type Genre } from "@/lib/genre";
import type { TastingRecord } from "@/lib/types";

const LEVELS = [1, 2, 3, 4, 5] as const;

const SWEET_WORDS = ["辛口", "やや辛口", "中くらいの甘さ", "やや甘口", "甘口"];
const BODY_WORDS = ["軽い", "やや軽め", "中くらいのコク", "ややしっかり", "しっかり"];

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 平均の評価が高いマスほど濃く塗る */
function cellColor(avg: number) {
  const pct = Math.round(15 + ((avg - 1) / 4) * 85);
  return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
}

/**
 * 甘さ（横）とコク（縦）で記録を並べた味の地図。
 * マスの数字は杯数、色の濃さは総合の平均。マスを押すとそのお酒を出す。
 * 2種類以上あれば、ジャンルで絞り込める
 */
export default function TasteMap({ records }: { records: TastingRecord[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [genre, setGenre] = useState<Genre | null>(null);
  const all = records.filter((r) => r.sweetness && r.body);
  const genres = GENRES.filter((g) => all.some((r) => genreOf(r) === g));
  const placed = genre ? all.filter((r) => genreOf(r) === genre) : all;
  if (all.length === 0) {
    return (
      <section className="card">
        <h2 style={{ fontSize: 14 }}>味マップ</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          記録で「甘さ」と「コク」を付けると、どんな味のお酒が好きかを地図で見られます。
        </p>
      </section>
    );
  }

  const cells = new Map<string, TastingRecord[]>();
  for (const r of placed) {
    const key = `${r.sweetness}-${r.body}`;
    cells.set(key, [...(cells.get(key) ?? []), r]);
  }

  // 高く評価したお酒が集まっている場所をことばにする
  const liked = placed.filter((r) => r.overall >= 4);
  const center = liked.length >= 2 && {
    sweet: Math.round(average(liked.map((r) => r.sweetness!))) - 1,
    body: Math.round(average(liked.map((r) => r.body!))) - 1,
  };
  const picked = selected ? (cells.get(selected) ?? []) : [];

  return (
    <section className="card" style={{ gap: 10 }}>
      <h2 style={{ fontSize: 14 }}>味マップ</h2>
      {genres.length > 1 && (
        <div className="scroll-row" role="group" aria-label="味マップをジャンルで絞り込み">
          <button
            type="button"
            className="chip"
            aria-pressed={genre === null}
            onClick={() => {
              setGenre(null);
              setSelected(null);
            }}
          >
            すべて
          </button>
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": genreColor(g) } as React.CSSProperties}
              aria-pressed={genre === g}
              onClick={() => {
                setGenre(genre === g ? null : g);
                setSelected(null);
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}
      {center && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {genre ? `${genre}で` : ""}高く評価したお酒は<strong>{SWEET_WORDS[center.sweet]}・{BODY_WORDS[center.body]}</strong>のあたりに集まっています。
        </p>
      )}
      <div className="taste-map">
        <div className="taste-map-y" aria-hidden="true">
          <span>濃い</span>
          <span>コク</span>
          <span>軽い</span>
        </div>
        <div className="taste-map-grid" role="group" aria-label="甘さとコクの地図">
          {[...LEVELS].reverse().flatMap((body) =>
            LEVELS.map((sweet) => {
              const key = `${sweet}-${body}`;
              const rs = cells.get(key) ?? [];
              const avg = rs.length ? average(rs.map((r) => r.overall)) : 0;
              return (
                <button
                  key={key}
                  type="button"
                  className="taste-map-cell"
                  disabled={rs.length === 0}
                  aria-pressed={selected === key}
                  aria-label={`甘さ${sweet}・コク${body}：${rs.length}杯${rs.length ? `、平均★${avg.toFixed(1)}` : ""}`}
                  style={rs.length ? { background: cellColor(avg), color: avg >= 3 ? "var(--on-accent)" : undefined } : undefined}
                  onClick={() => setSelected(selected === key ? null : key)}
                >
                  {rs.length || ""}
                </button>
              );
            }),
          )}
        </div>
        <div className="taste-map-x" aria-hidden="true">
          <span>辛口</span>
          <span>甘さ</span>
          <span>甘口</span>
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        数字は杯数、色が濃いほど総合の評価が高めです。マスを押すとそのお酒が出ます。
      </p>
      {picked.map((r) => (
        <RecordCard key={r.id} record={r} />
      ))}
    </section>
  );
}
