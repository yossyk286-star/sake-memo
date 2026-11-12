"use client";

import Link from "next/link";
import { useMemo } from "react";
import { tr } from "@/lib/i18n";
import { recapYear } from "@/lib/recap";
import type { TastingRecord } from "@/lib/types";

/** 12月と1月だけ、一覧の上に「1年まとめ」への入口を出す（5） */
export default function YearRecapCard({ records }: { records: TastingRecord[] }) {
  const year = recapYear();
  const count = useMemo(() => (year ? records.filter((r) => r.date.startsWith(`${year}-`)).length : 0), [records, year]);
  if (!year || count < 5) return null;
  return (
    <Link href={`/year?y=${year}`} className="recap-band year-band">
      <span className="recap-eyebrow">{tr("{0}年のまとめ", year)}</span>
      <strong>{tr("{0}杯をふりかえる", count)}</strong>
    </Link>
  );
}
