"use client";

import { useEffect, useState } from "react";
import { tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";
import { listRecords } from "@/lib/db";
import { isHome } from "@/lib/shops";
import { loadShopToday, saveShopToday } from "@/lib/shopToday";

/**
 * 今日のお店。名前を入れておくと、記録するときの店名に先に入る（毎回打たなくてよい）。
 * 共有しているメニュー（飲み物・料理）の数と、2軒目に行ったときに名前とメニューを空にするボタンも出す。
 * 「同じお店」はその日に読み取ったメニューどうしなので、ここで区切れるようにする
 */
export default function ShopBar({ drinks, dishes, onReset }: { drinks: number; dishes: number; onReset: () => void }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [past, setPast] = useState<string[]>([]);

  useEffect(() => {
    setName(loadShopToday());
    listRecords().then((rs) => setPast([...new Set(rs.map((r) => r.shop.trim()).filter((s) => s && !isHome(s)))]));
  }, []);

  const parts = [drinks > 0 && tr("飲み物 {0}", drinks), dishes > 0 && tr("料理 {0}", dishes)].filter(Boolean).join(tr("・"));
  const icon = (
    <span className="shop-bar-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6" />
      </svg>
    </span>
  );

  if (editing)
    return (
      <form
        className="shop-bar"
        onSubmit={(e) => {
          e.preventDefault();
          saveShopToday(text);
          setName(text.trim());
          setEditing(false);
        }}
      >
        {icon}
        <input
          className="input shop-bar-input"
          list="shop-today-names"
          placeholder={tr("店名（例：〇〇酒場）")}
          aria-label={tr("今日のお店の名前")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          enterKeyHint="done"
        />
        <datalist id="shop-today-names">
          {past.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="submit" className="shop-bar-reset">
          {tr("決定")}
        </button>
      </form>
    );

  const edit = () => {
    setText(name);
    setEditing(true);
  };

  return (
    <div className="shop-bar">
      {icon}
      <span className="shop-bar-text">
        {name ? (
          <button type="button" className="shop-bar-name" onClick={edit} aria-label={tr("今日のお店の名前を変える")}>
            <strong>{name}</strong>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
            </svg>
          </button>
        ) : (
          <button type="button" className="shop-bar-name is-empty" onClick={edit}>
            <strong>{tr("＋ 今日のお店の名前")}</strong>
          </button>
        )}
        <span>
          {name || parts
            ? [tr("今日のお店"), parts && trv(parts)].filter(Boolean).join(tr("・"))
            : tr("入れると記録のときに店名が入ります")}
        </span>
      </span>
      {(name || drinks + dishes > 0) && (
        <button
          type="button"
          className="shop-bar-reset"
          onClick={async () => {
            if (await askConfirm({ message: tr("お店の名前と今日読み取ったメニューを消して、新しいお店にしますか？"), action: tr("新しいお店") })) {
              setName("");
              onReset();
            }
          }}
        >
          {tr("新しいお店")}
        </button>
      )}
    </div>
  );
}
