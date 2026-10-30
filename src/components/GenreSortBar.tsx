"use client";

import {
  GENRES,
  SORT_LABELS,
  genreColor,
  type Genre,
  type SortKey,
} from "@/lib/genre";
import { tr, trv } from "@/lib/i18n";

/** ジャンルの絞り込みと、甘口・辛口などの並び替え。ジャンルは出てくるものだけ並べる */
export default function GenreSortBar({
  genres,
  genre,
  onGenre,
  sort,
  onSort,
  sorts,
  defaultLabel,
  extra,
}: {
  genres: (Genre | null)[];
  genre: Genre | null;
  onGenre: (g: Genre | null) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  sorts: SortKey[];
  defaultLabel: string;
  /** ジャンルの前に並べるボタン（★4以上など） */
  extra?: React.ReactNode;
}) {
  const used = GENRES.filter((g) => genres.includes(g));
  return (
    <>
      {(used.length > 1 || extra) && (
        <div
          className="scroll-row"
          role="group"
          aria-label={tr("ジャンルで絞り込み")}
        >
          {trv(extra)}
          {(used.length > 1 ? used : []).map((g) => (
            <button
              key={g}
              type="button"
              className="chip kind-chip"
              style={{ "--kc": genreColor(g) } as React.CSSProperties}
              aria-pressed={genre === g}
              onClick={() => onGenre(genre === g ? null : g)}
            >
              {trv(g)}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-row" role="group" aria-label={tr("並び替え")}>
        {(["default", ...sorts] as SortKey[]).map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-pressed={sort === s}
            onClick={() => onSort(s)}
          >
            {s === "default" ? tr(defaultLabel) : tr(SORT_LABELS[s])}
          </button>
        ))}
      </div>
    </>
  );
}
