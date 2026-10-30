"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hint from "@/components/Hint";
import MenuScan from "@/components/MenuScan";
import ScanTabs from "@/components/ScanTabs";
import ShopBar from "@/components/ShopBar";
import { loadTodayMenu, resetShop } from "@/lib/foodPairing";
import { LAST_SCAN_EVENT, loadLastScan } from "@/lib/lastScan";
import type { ScannedDrink } from "@/lib/menuScan";
import { tr } from "@/lib/i18n";

/** お店でメニューやラベルを撮ったり名前で調べたりして、注文を決めるために確認するだけの画面。記録はあとからでもできる */
export default function ScanPage() {
  const router = useRouter();
  const [drinks, setDrinks] = useState<ScannedDrink[] | null>(null);
  // 今日のお店のメニューの数（調べるたびに増えるので、一覧が変わった合図で数え直す）
  const [counts, setCounts] = useState({ drinks: 0, dishes: 0 });
  // 「新しいお店」で一覧を作り直すための番号
  const [shop, setShop] = useState(0);

  useEffect(() => {
    setDrinks(loadLastScan()?.drinks ?? []);
    const count = () => setCounts({ drinks: loadLastScan()?.drinks.length ?? 0, dishes: loadTodayMenu().length });
    count();
    window.addEventListener(LAST_SCAN_EVENT, count);
    return () => window.removeEventListener(LAST_SCAN_EVENT, count);
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>{tr("お酒を調べる")}</h1>
        <Link href="/show" className="header-pill">
          {tr("店員さんに見せる")}
        </Link>
      </header>

      <ScanTabs current="drink" />
      <ShopBar
        drinks={counts.drinks}
        dishes={counts.dishes}
        onReset={() => {
          resetShop();
          setDrinks([]);
          setShop((n) => n + 1);
        }}
      />

      <Hint id="scan-page" className="lead scan-hint">
        {tr("撮ったり調べたりした結果は今日のあいだ残るので、あとから「記録する」でも同じお酒から選べます。 次に試したいお酒は「☆」で")}<Link href="/wishlist">{tr("気になるお酒")}</Link>{tr("に残せます。")}
      </Hint>

      {drinks && (
        <MenuScan
          key={shop}
          initialDrinks={drinks}
          onPick={(d) => router.push(`/new?drink=${encodeURIComponent(d.name)}`)}
        />
      )}
    </>
  );
}
