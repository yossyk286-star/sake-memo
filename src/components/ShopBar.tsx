import { tr, trv } from "@/lib/i18n";
/**
 * 今日のお店として共有しているメニュー（飲み物・料理）の数と、2軒目に行ったときに空にするボタン。
 * 「同じお店」はその日に読み取ったメニューどうしなので、ここで区切れるようにする
 */
export default function ShopBar({ drinks, dishes, onReset }: { drinks: number; dishes: number; onReset: () => void }) {
  if (drinks + dishes === 0) return null;
  const parts = [drinks > 0 && tr("飲み物 {0}", drinks), dishes > 0 && tr("料理 {0}", dishes)].filter(Boolean).join(tr("・"));
  return (
    <div className="shop-bar">
      <span className="shop-bar-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6" />
        </svg>
      </span>
      <span className="shop-bar-text">
        <strong>{tr("今日のお店のメニュー")}</strong>
        <span>{trv(parts)}</span>
      </span>
      <button
        type="button"
        className="shop-bar-reset"
        onClick={() => {
          if (window.confirm(tr("今日読み取ったメニューを消して、新しいお店にしますか？"))) onReset();
        }}
      >
        {tr("新しいお店")}
      </button>
    </div>
  );
}
