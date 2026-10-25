"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteWish, listWishes, type WishDrink } from "@/lib/db";

/** メニューで「気になる」と印を付けた、次に試したいお酒の一覧 */
export default function WishlistPage() {
  const [wishes, setWishes] = useState<WishDrink[] | null>(null);

  useEffect(() => {
    listWishes().then(setWishes);
  }, []);

  async function remove(id: string) {
    await deleteWish(id);
    setWishes((ws) => ws?.filter((w) => w.id !== id) ?? null);
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          ‹ 戻る
        </Link>
        <h1>気になるお酒</h1>
      </header>

      <main className="content" style={{ paddingTop: 16 }}>
        {wishes?.length === 0 && (
          <p className="empty">
            まだありません。
            <br />
            メニューを撮ったときに「☆ 気になる」を押すと、ここに残ります。
          </p>
        )}
        {wishes?.map((w) => (
          <article key={w.id} className="card">
            <div className="card-top">
              <h2>{w.name}</h2>
              <span className="muted">{new Date(w.savedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
            </div>
            <div className="tags">
              {[w.kind, w.style, w.origin].filter(Boolean).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            {w.menuNote && <p className="muted">メニューの説明：{w.menuNote}</p>}
            <p className="term-desc">{w.explanation}</p>
            <div className="row">
              <Link href={`/new?wish=${w.id}`} className="btn-primary" style={{ flex: 1 }}>
                ＋ 記録に追加
              </Link>
              <button type="button" className="btn-secondary btn-danger" onClick={() => remove(w.id)}>
                外す
              </button>
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
