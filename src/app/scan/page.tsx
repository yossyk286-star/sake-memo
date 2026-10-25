"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MenuScan from "@/components/MenuScan";
import { loadLastScan } from "@/lib/lastScan";
import type { ScannedDrink } from "@/lib/menuScan";

/** お店でメニューを撮って、注文を決めるために確認するだけの画面。記録はあとからでもできる */
export default function ScanPage() {
  const router = useRouter();
  const [drinks, setDrinks] = useState<ScannedDrink[] | null>(null);

  useEffect(() => {
    setDrinks(loadLastScan()?.drinks ?? []);
  }, []);

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>メニューを見る</h1>
      </header>

      <p className="lead">
        撮った結果は今日のあいだ残るので、あとから「記録する」でも同じお酒から選べます。
        次に試したいお酒は「☆ 気になる」で<Link href="/wishlist">気になるお酒</Link>に残せます。
      </p>

      {drinks && (
        <MenuScan
          initialDrinks={drinks}
          onPick={(d) => router.push(`/new?drink=${encodeURIComponent(d.name)}`)}
        />
      )}
    </>
  );
}
