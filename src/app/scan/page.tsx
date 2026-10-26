"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hint from "@/components/Hint";
import MenuScan from "@/components/MenuScan";
import { loadLastScan } from "@/lib/lastScan";
import type { ScannedDrink } from "@/lib/menuScan";

/** お店でメニューやラベルを撮ったり名前で調べたりして、注文を決めるために確認するだけの画面。記録はあとからでもできる */
export default function ScanPage() {
  const router = useRouter();
  const [drinks, setDrinks] = useState<ScannedDrink[] | null>(null);

  useEffect(() => {
    setDrinks(loadLastScan()?.drinks ?? []);
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>お酒を調べる</h1>
      </header>

      <Hint id="scan-page" className="lead">
        撮ったり調べたりした結果は今日のあいだ残るので、あとから「記録する」でも同じお酒から選べます。
        次に試したいお酒は「☆」で<Link href="/wishlist">気になるお酒</Link>に残せます。
      </Hint>

      {drinks && (
        <MenuScan
          initialDrinks={drinks}
          onPick={(d) => router.push(`/new?drink=${encodeURIComponent(d.name)}`)}
        />
      )}
    </>
  );
}
