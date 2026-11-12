"use client";

import BackLink from "@/components/BackLink";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import RecordCard, { drinkTitle, Stars, stars } from "@/components/RecordCard";
import { listRecords } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";

const same = (a: string, b: string) => a.trim().normalize("NFKC").toLowerCase() === b.trim().normalize("NFKC").toLowerCase();

/** 蔵元・醸造所のページ（34）。その蔵で飲んだ記録と平均、同じ蔵のお酒を調べる入口 */
function MakerBody() {
  const name = useSearchParams().get("name") ?? "";
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  useEffect(() => {
    listRecords().then(setRecords);
  }, []);
  const mine = useMemo(() => (records ?? []).filter((r) => r.maker && same(r.maker, name)), [records, name]);
  const best = mine.reduce<TastingRecord | null>((b, r) => (!b || r.overall > b.overall ? r : b), null);
  const avg = mine.length ? Math.round((mine.reduce((s, r) => s + r.overall, 0) / mine.length) * 10) / 10 : 0;
  // 同じ蔵の、名前の違うお酒の数
  const kinds = new Set(mine.map((r) => r.name.trim())).size;
  const where = [...new Set(mine.map((r) => r.origin).filter(Boolean))];

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{trv(name)}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        {records && mine.length === 0 && <p className="empty">{tr("この蔵の記録はありません。")}</p>}
        {best && (
          <>
            <section className="highlight">
              <p className="highlight-label">{tr("この蔵でいちばんおいしかったお酒")}</p>
              <p className="highlight-main">{drinkTitle(best)}</p>
              <Stars n={best.overall} />
            </section>
            <p className="muted" style={{ margin: 0, padding: "0 4px" }}>
              {trJoin([tr("{0}本・{1}杯", kinds, mine.length), tr("平均{0}", stars(avg)), ...where])}
            </p>
            <Link href={`/scan?q=${encodeURIComponent(name)}`} className="btn-secondary">
              {tr("この蔵のほかのお酒を調べる")}
            </Link>
            <div className="list-group">
              {mine.map((r) => (
                <RecordCard key={r.id} record={r} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function MakerPage() {
  return (
    <Suspense>
      <MakerBody />
    </Suspense>
  );
}
