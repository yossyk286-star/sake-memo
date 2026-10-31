"use client";

import { useState } from "react";
import RecordCard from "./RecordCard";
import { GENRES, genreColor, genreOf, type Genre } from "@/lib/genre";
import type { TastingRecord } from "@/lib/types";
import { tr, trv } from "@/lib/i18n";

const LEVELS = [1, 2, 3, 4, 5] as const;

const SWEET_WORDS = ["辛口", "やや辛口", "中くらいの甘さ", "やや甘口", "甘口"];
const BODY_WORDS = ["軽い", "やや軽め", "中くらいのコク", "ややしっかり", "しっかり"];

function average(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 平均の評価を ★1〜5 の5段階にして、高いマスほど濃く塗る（色は globals.css の .taste-map-cell[data-step]） */
function step(avg: number) {
  return Math.min(5, Math.max(1, Math.round(avg)));
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
        <h2 style={{ fontSize: 14 }}>{tr("味マップ")}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {tr("記録で「甘さ」と「コク」を付けると、どんな味のお酒が好きかを地図で見られます。")}
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
      <h2 style={{ fontSize: 14 }}>{tr("味マップ")}</h2>
      {genres.length > 1 && (
        <div className="scroll-row" role="group" aria-label={tr("味マップをジャンルで絞り込み")}>
          <button
            type="button"
            className="chip"
            aria-pressed={genre === null}
            onClick={() => {
              setGenre(null);
              setSelected(null);
            }}
          >
            {tr("すべて")}
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
              {trv(g)}
            </button>
          ))}
        </div>
      )}
      {center && (
        <p style={{ margin: 0, fontSize: 14 }}>
          {genre ? tr("{0}で", genre) : ""}{tr("高く評価したお酒は")}<strong>{tr("{0}・{1}", SWEET_WORDS[center.sweet], BODY_WORDS[center.body])}</strong>{tr("のあたりに集まっています。")}
        </p>
      )}
      <div className="taste-map">
        <div className="taste-map-y" aria-hidden="true">
          <span>{tr("濃い")}</span>
          <span>{tr("コク")}</span>
          <span>{tr("軽い")}</span>
        </div>
        <div className="taste-map-grid" role="group" aria-label={tr("甘さとコクの地図")}>
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
                  aria-label={tr("甘さ{0}・コク{1}：{2}杯{3}", sweet, body, rs.length, rs.length ? tr("、平均★{0}", avg.toFixed(1)) : "")}
                  data-step={rs.length ? step(avg) : undefined}
                  onClick={() => setSelected(selected === key ? null : key)}
                >
                  {rs.length || ""}
                </button>
              );
            }),
          )}
        </div>
        <div className="taste-map-x" aria-hidden="true">
          <span>{tr("辛口")}</span>
          <span>{tr("甘さ")}</span>
          <span>{tr("甘口")}</span>
        </div>
      </div>
      <div className="taste-map-scale" aria-hidden="true">
        <span>{tr("総合の平均")}</span>
        <span>★1</span>
        {LEVELS.map((n) => (
          <i key={n} className="taste-map-cell" data-step={n} />
        ))}
        <span>★5</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        {tr("数字は杯数です。マスを押すとそのお酒が出ます。")}
      </p>
      {picked.map((r) => (
        <RecordCard key={r.id} record={r} />
      ))}
    </section>
  );
}
