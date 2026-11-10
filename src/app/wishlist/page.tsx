"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GenreSortBar from "@/components/GenreSortBar";
import { deleteWish, listWishes, type WishDrink } from "@/lib/db";
import { genreOf, sortBy, type Genre, type SortKey } from "@/lib/genre";
import EmptyState from "@/components/EmptyState";
import { tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";

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
    if (!(await askConfirm({ message: tr("{0}気になるリストから外しますか？", name ? tr("「{0}」を", name) : ""), action: tr("外す") }))) return;
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
        <h1>{tr("気になるお酒")}</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes && wishes.length > 1 && (
          <div className="filter-bar" data-tour="wish-sort">
            <GenreSortBar
              genres={wishes.map(genreOf)}
              genre={genre}
              onGenre={setGenre}
              sort={sort}
              onSort={setSort}
              sorts={["sweet", "dry", "abvLow", "abvHigh"]}
              defaultLabel={tr("新しい順")}
            />
          </div>
        )}
        {wishes?.length === 0 && (
          <div data-tour="wish-item">
            <EmptyState
              title={tr("気になるお酒、まだないよ")}
              actions={[{ href: "/scan", label: tr("メニューを撮って探す") }]}
            >
              {tr("お店でメニューを撮って「☆ 気になる」を押すと、ここに残るよ。")}
            </EmptyState>
          </div>
        )}
        {shown.length > 0 && (
          <div className="list-group">
            {shown.map((w, i) => (
              <div key={w.id} className="wish-row" data-tour={i === 0 ? "wish-item" : undefined}>
                <details>
                  <summary>
                    <strong>{trv(w.name)}</strong>
                    <span className="muted">
                      {[w.kind, w.style, w.origin].filter(Boolean).map((t) => trv(t as string)).join("・")}
                    </span>
                  </summary>
                  <div className="fold-body">
                  {w.menuNote && <p className="muted">{tr("メニューの説明：{0}", w.menuNote)}</p>}
                  <p className="term-desc">{trv(w.explanation)}</p>
                  <div className="wish-foot">
                    <span className="muted">
                      {tr("{0}に保存", new Date(w.savedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }))}
                    </span>
                    <button type="button" className="btn-ghost wish-remove" onClick={() => remove(w.id)}>
                      {tr("外す")}
                    </button>
                  </div>
                  </div>
                </details>
                <Link href={`/new?wish=${w.id}`} className="wish-add" aria-label={tr("「{0}」を記録に追加", w.name)}>
                  {tr("＋記録")}
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
