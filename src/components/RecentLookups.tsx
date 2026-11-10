"use client";

import { useEffect, useState } from "react";
import { tr, trJoin, trv } from "@/lib/i18n";
import type { ScannedDrink } from "@/lib/menuScan";
import { recentSaved } from "@/lib/savedLookups";

/** 調べる画面の下に、前に調べたお酒を3つ。押すと今日の一覧に入る（AI は呼ばない） */
export default function RecentLookups({
  onOpen,
  onRecord,
}: {
  onOpen: (d: ScannedDrink) => void;
  onRecord: (d: ScannedDrink) => void;
}) {
  const [items, setItems] = useState<ScannedDrink[]>([]);
  useEffect(() => setItems(recentSaved(3)), []);
  if (items.length === 0) return null;
  return (
    <section className="recent-lookups" aria-label={tr("最近調べたお酒")}>
      <h2 className="section-title">{tr("最近調べたお酒")}</h2>
      <div className="list-group">
        {items.map((d) => (
          <div key={d.name} className="card recent-row">
            <button type="button" className="recent-open" onClick={() => onOpen(d)}>
              <strong>{trv(d.name)}</strong>
              <span className="muted">{trJoin([d.kind, d.style, d.origin]) || " "}</span>
            </button>
            <button type="button" className="chip" onClick={() => onRecord(d)}>
              {tr("＋記録")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
