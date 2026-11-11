"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadShopToday } from "@/lib/shopToday";
import { today } from "@/lib/lastScan";
import { tr, trv } from "@/lib/i18n";
import { yen } from "./RecordCard";
import { APP, WORDS } from "@/lib/appeal";
import type { TastingRecord } from "@/lib/types";

/** 今日のお店を入れている間、いちばん上に「店・今夜N杯・金額」の黒いカプセルを出す（23）。押すと調べる画面へ */
export default function ShopCapsule({ records }: { records: TastingRecord[] }) {
  const [shop, setShop] = useState("");
  useEffect(() => setShop(loadShopToday()), []);
  if (!shop) return null;
  const mine = records.filter((r) => r.date === today() && r.shop === shop);
  const total = mine.reduce((s, r) => s + (r.price ?? 0), 0);
  const parts = [trv(shop), APP.id === "sake-memo" ? tr("今夜{0}{1}", mine.length, WORDS.cup) : tr("今日{0}{1}", mine.length, WORDS.cup)];
  if (total > 0) parts.push(yen(total));
  return (
    <div className="shop-capsule-wrap">
      <Link href="/scan" className="shop-capsule" aria-label={tr("今日のお店：{0}", parts.join(tr("・")))}>
        <span className="shop-capsule-dot" aria-hidden="true" />
        {parts.join(" · ")}
      </Link>
    </div>
  );
}
