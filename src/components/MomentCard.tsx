"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MOMENT } from "@/lib/appeal";
import { tr, trv } from "@/lib/i18n";
import { localDate } from "@/lib/buddy";

const KEY = "sake-memo:moment-closed";

/** 飲むことが多い時間（さけは夜・まめは朝）に、記録の一覧の上へ「記録する」「撮る」を出す（18）。✕ でその日は出さない */
export default function MomentCard() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = new Date().getHours();
    const inTime = (h >= MOMENT.from && h < MOMENT.to) || (MOMENT.to > 24 && h < MOMENT.to - 24);
    let closed = false;
    try {
      closed = localStorage.getItem(KEY) === localDate(new Date(Date.now() - (h < 6 ? 6 * 3600_000 : 0)));
    } catch {}
    setShow(inTime && !closed);
  }, []);
  if (!show) return null;
  function close() {
    const h = new Date().getHours();
    try {
      localStorage.setItem(KEY, localDate(new Date(Date.now() - (h < 6 ? 6 * 3600_000 : 0))));
    } catch {}
    setShow(false);
  }
  return (
    <section className="moment-card" aria-label={trv(MOMENT.title)}>
      <strong>{trv(MOMENT.title)}</strong>
      <button type="button" className="moment-close" aria-label={tr("閉じる")} onClick={close}>
        ✕
      </button>
      <div className="moment-actions">
        <Link href="/new" className="btn-primary">
          {tr("記録する")}
        </Link>
        <Link href="/scan" className="btn-secondary">
          {trv(MOMENT.shoot)}
        </Link>
      </div>
    </section>
  );
}
