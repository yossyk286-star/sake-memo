"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GenreSortBar from "@/components/GenreSortBar";
import { deleteWish, listWishes, type WishDrink } from "@/lib/db";
import { genreOf, sortBy, type Genre, type SortKey } from "@/lib/genre";
import EmptyState from "@/components/EmptyState";

/** メニューで「気になる」と印を付けた、次に試したいお酒の一覧 */
export default function WishlistPage() {
  const [wishes, setWishes] = useState<WishDrink[] | null>(null);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sort, setSort] = useState<SortKey>("default");

  useEffect(() => {
    listWishes().then(setWishes);
  }, []);

  async function remove(id: string) {
    const name = wishes?.find((w) => w.id === id)?.name;
    if (!confirm(`${name ? `「${name}」を` : ""}気になるリストから外しますか？`)) return;
    await deleteWish(id);
    setWishes((ws) => ws?.filter((w) => w.id !== id) ?? null);
  }

  const shown = useMemo(
    () =>
      sortBy(
        (wishes ?? []).filter((w) => !genre || genreOf(w) === genre),
        sort,
        (w) => ({ sweetness: w.taste.sweetness, abv: w.abv ?? null }),
      ),
    [wishes, genre, sort],
  );

  return (
    <>
      <header className="page-header">
        <h1>気になるお酒</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes && wishes.length > 1 && (
          <div className="filter-bar">
            <GenreSortBar
              genres={wishes.map(genreOf)}
              genre={genre}
              onGenre={setGenre}
              sort={sort}
              onSort={setSort}
              sorts={["sweet", "dry", "abvLow", "abvHigh"]}
              defaultLabel="新しい順"
            />
          </div>
        )}
        {wishes?.length === 0 && (
          <EmptyState
            title="気になるお酒、まだないよ"
            actions={[{ href: "/scan", label: "メニューを撮って探す" }]}
          >
            お店でメニューを撮って「☆ 気になる」を押すと、ここに残るよ。
          </EmptyState>
        )}
        {shown.map((w) => (
          <article key={w.id} className="card">
            <div className="card-top">
              <h2>{w.name}</h2>
              <span className="muted">
                {new Date(w.savedAt).toLocaleDateString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="tags">
              {[w.kind, w.style, w.origin].filter(Boolean).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            {w.menuNote && (
              <p className="muted">メニューの説明：{w.menuNote}</p>
            )}
            <p className="term-desc">{w.explanation}</p>
            <div className="row">
              <Link
                href={`/new?wish=${w.id}`}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                ＋ 記録に追加
              </Link>
              <button
                type="button"
                className="btn-secondary btn-danger"
                onClick={() => remove(w.id)}
              >
                外す
              </button>
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
